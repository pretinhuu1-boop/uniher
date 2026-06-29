'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Hook do questionário COPSOQ41 (FE contra /api/yavix/copsoq/*).
// Máquina de estado API-driven. SPEC_YAVIX_COPSOQ_PROXY.md §6.
//
// - bootstrap (1 fetch) ao montar; persiste sessionId em localStorage.
// - autosave por pergunta com debounce ~600ms (PATCH /answer), UI otimista.
// - paginação por bloco; progresso só sobre type==='QUESTION'.
// - recovery: 404 em bootstrap/answer → limpa sessionId e refaz bootstrap.
// - submit → trata 422 { missing[] }.
// - i18n: t(label, locale) com fallback 'pt'.
//
// ⚠️ PII: nunca logar respostas/token/CPF. Não há console.log de answers aqui.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CopsoqBootstrap,
  CopsoqQuestion,
  CopsoqSavedAnswer,
  I18nText,
  Locale,
} from '@/lib/yavix/copsoq.types';

const SESSION_KEY = 'yavix_copsoq_session';
const AUTOSAVE_DEBOUNCE_MS = 600;
const QUESTIONS_PER_PAGE = 4;

export type CopsoqScreen = 'consent' | 'form' | 'review' | 'done';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** i18n: renderiza label[locale] com fallback para 'pt'. */
export function t(label: I18nText | undefined, locale: Locale): string {
  if (!label) return '';
  return label[locale] ?? label.pt ?? '';
}

interface UseCopsoqState {
  screen: CopsoqScreen;
  loading: boolean;
  error: string | null;
  bootstrap: CopsoqBootstrap | null;
  locale: Locale;
  /** code -> value canônico ("1".."5") — espelho local otimista das respostas */
  answers: Record<number, string>;
  page: number;
  saveState: SaveState;
  missing: number[];
  submitting: boolean;
  consenting: boolean;
  /** code da 1ª pergunta pendente a receber foco (a11y); null = nada a focar */
  focusCode: number | null;
}

const INITIAL: UseCopsoqState = {
  screen: 'consent',
  loading: true,
  error: null,
  bootstrap: null,
  locale: 'pt',
  answers: {},
  page: 0,
  saveState: 'idle',
  missing: [],
  submitting: false,
  consenting: false,
  focusCode: null,
};

function readSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionId(id: string): void {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* localStorage indisponível — segue sem retomada persistida */
  }
}

function clearSessionId(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function useCopsoq(initialLocale: Locale = 'pt') {
  const [state, setState] = useState<UseCopsoqState>({ ...INITIAL, locale: initialLocale });

  // timers de debounce por code (autosave independente por pergunta)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mounted = useRef(true);

  // ── bootstrap ──────────────────────────────────────────────────────────────
  const loadBootstrap = useCallback(async (locale: Locale) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      // retomada honesta: envia o sessionId persistido (se houver). O mock o
      // ignora (chaveia por userId); a Onda 3 usa-o p/ identificar a sessão Yavix.
      const persisted = readSessionId();
      const query = `locale=${locale}${persisted ? `&sessionId=${encodeURIComponent(persisted)}` : ''}`;
      const res = await fetch(`/api/yavix/copsoq/bootstrap?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 404) {
        // Recovery: sessão inexistente no servidor → limpa e refaz.
        clearSessionId();
        const retry = await fetch(`/api/yavix/copsoq/bootstrap?locale=${locale}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!retry.ok) throw new Error('Falha ao recarregar o questionário.');
        const data = (await retry.json()) as CopsoqBootstrap;
        applyBootstrap(data);
        return;
      }

      if (!res.ok) {
        throw new Error('Não foi possível carregar o questionário. Tente novamente.');
      }

      const data = (await res.json()) as CopsoqBootstrap;
      applyBootstrap(data);
    } catch (err) {
      if (!mounted.current) return;
      const message = err instanceof Error ? err.message : 'Erro ao carregar.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
    // applyBootstrap é estável (definido abaixo via closure de setState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyBootstrap = useCallback((data: CopsoqBootstrap) => {
    if (!mounted.current) return;
    writeSessionId(data.sessionId);

    // Reidrata answers do bootstrap (retomada).
    const answers: Record<number, string> = {};
    for (const saved of Object.values(data.answers) as CopsoqSavedAnswer[]) {
      answers[saved.code] = saved.value;
    }

    const screen: CopsoqScreen = data.status === 'DONE'
      ? 'done'
      : data.hasPendingTerms
        ? 'consent'
        : 'form';

    setState((s) => ({
      ...s,
      loading: false,
      error: null,
      bootstrap: data,
      locale: data.locale,
      answers,
      page: 0,
      screen,
      saveState: 'idle',
      missing: [],
    }));
  }, []);

  useEffect(() => {
    mounted.current = true;
    // loadBootstrap lê o sessionId persistido (readSessionId) e o envia como
    // ?sessionId= para tornar a retomada honesta; o servidor segue sendo a verdade.
    loadBootstrap(state.locale);
    const currentTimers = timers.current;
    return () => {
      mounted.current = false;
      for (const tmr of currentTimers.values()) clearTimeout(tmr);
      currentTimers.clear();
    };
    // montagem única
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── autosave (debounce por pergunta) ─────────────────────────────────────────
  const flushAnswer = useCallback(async (code: number, value: string) => {
    setState((s) => ({ ...s, saveState: 'saving' }));
    try {
      const res = await fetch('/api/yavix/copsoq/answer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, value }),
      });

      if (res.status === 404) {
        // Recovery: sessão perdida → refaz bootstrap.
        clearSessionId();
        // não deixar o indicador preso em 'saving' durante a recuperação.
        if (mounted.current) setState((s) => ({ ...s, saveState: 'idle' }));
        if (mounted.current) await loadBootstrap(state.locale);
        return;
      }

      if (res.status !== 204) {
        throw new Error('save-failed');
      }

      if (mounted.current) setState((s) => ({ ...s, saveState: 'saved' }));
    } catch {
      if (mounted.current) setState((s) => ({ ...s, saveState: 'error' }));
    }
  }, [loadBootstrap, state.locale]);

  /** Seleção otimista de uma resposta + agendamento do autosave. */
  const selectAnswer = useCallback((code: number, value: string) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [code]: value },
      saveState: 'idle',
      // remove a pergunta da lista de pendências quando respondida
      missing: s.missing.filter((m) => m !== code),
    }));

    const existing = timers.current.get(code);
    if (existing) clearTimeout(existing);
    const tmr = setTimeout(() => {
      timers.current.delete(code);
      void flushAnswer(code, value);
    }, AUTOSAVE_DEBOUNCE_MS);
    timers.current.set(code, tmr);
  }, [flushAnswer]);

  // ── consent ──────────────────────────────────────────────────────────────────
  const acceptTerm = useCallback(async (termId: number) => {
    setState((s) => ({ ...s, consenting: true }));
    try {
      const res = await fetch('/api/yavix/copsoq/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId }),
      });
      // 204 = aceito; 409 = já aceito → ambos liberam o formulário.
      if (res.status === 204 || res.status === 409) {
        await loadBootstrap(state.locale);
        return true;
      }
      throw new Error('consent-failed');
    } catch {
      if (mounted.current) {
        setState((s) => ({ ...s, error: 'Não foi possível registrar o aceite. Tente novamente.' }));
      }
      return false;
    } finally {
      if (mounted.current) setState((s) => ({ ...s, consenting: false }));
    }
  }, [loadBootstrap, state.locale]);

  // ── submit ────────────────────────────────────────────────────────────────────
  const submit = useCallback(async (): Promise<{ done: boolean; missing: number[] }> => {
    setState((s) => ({ ...s, submitting: true, error: null }));
    try {
      const res = await fetch('/api/yavix/copsoq/submit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 200) {
        if (mounted.current) {
          setState((s) => ({ ...s, submitting: false, screen: 'done', missing: [] }));
        }
        return { done: true, missing: [] };
      }

      if (res.status === 422) {
        const body = (await res.json()) as { missing?: number[] };
        const missing = Array.isArray(body.missing) ? body.missing : [];
        if (mounted.current) {
          setState((s) => ({ ...s, submitting: false, missing }));
        }
        return { done: false, missing };
      }

      throw new Error('submit-failed');
    } catch {
      if (mounted.current) {
        setState((s) => ({ ...s, submitting: false, error: 'Falha ao enviar. Tente novamente.' }));
      }
      return { done: false, missing: [] };
    }
  }, []);

  // ── derivados (paginação + progresso só sobre QUESTION) ───────────────────────
  const questions = state.bootstrap?.questions ?? [];

  const questionItems = useMemo(
    () => questions.filter((q) => q.type === 'QUESTION'),
    [questions],
  );

  const pages = useMemo<CopsoqQuestion[][]>(() => {
    const out: CopsoqQuestion[][] = [];
    for (let i = 0; i < questions.length; i += QUESTIONS_PER_PAGE) {
      out.push(questions.slice(i, i + QUESTIONS_PER_PAGE));
    }
    return out;
  }, [questions]);

  const totalQuestions = questionItems.length;
  const answeredCount = useMemo(
    () => questionItems.filter((q) => state.answers[q.code] != null).length,
    [questionItems, state.answers],
  );
  const progress = totalQuestions === 0 ? 0 : Math.round((answeredCount / totalQuestions) * 100);

  const currentPage = pages[state.page] ?? [];
  const totalPages = pages.length;
  const isLastPage = state.page >= totalPages - 1;
  const isFirstPage = state.page <= 0;

  const goNext = useCallback(() => {
    setState((s) => {
      if (s.page >= pages.length - 1) {
        return { ...s, screen: 'review' };
      }
      return { ...s, page: s.page + 1 };
    });
  }, [pages.length]);

  const goBack = useCallback(() => {
    setState((s) => {
      if (s.screen === 'review') return { ...s, screen: 'form' };
      if (s.page <= 0) return s;
      return { ...s, page: s.page - 1 };
    });
  }, []);

  const goToReview = useCallback(() => {
    setState((s) => ({ ...s, screen: 'review' }));
  }, []);

  /** Vai para a página que contém o primeiro `code` pendente (após 422). */
  const goToFirstMissing = useCallback((missing: number[]) => {
    if (missing.length === 0) return;
    const first = missing[0];
    const pageIdx = pages.findIndex((pg) => pg.some((q) => q.code === first));
    if (pageIdx >= 0) {
      // muda a página e sinaliza o code a focar (a11y: foco programático no
      // radiogroup da 1ª pendente após a troca de bloco).
      setState((s) => ({ ...s, screen: 'form', page: pageIdx, focusCode: first }));
    }
  }, [pages]);

  /** Limpa o pedido de foco após o consumidor (CopsoqFlow) tê-lo aplicado. */
  const clearFocusCode = useCallback(() => {
    setState((s) => (s.focusCode === null ? s : { ...s, focusCode: null }));
  }, []);

  const retry = useCallback(() => {
    loadBootstrap(state.locale);
  }, [loadBootstrap, state.locale]);

  return {
    // estado
    screen: state.screen,
    loading: state.loading,
    error: state.error,
    locale: state.locale,
    terms: state.bootstrap?.terms ?? [],
    hasPendingTerms: state.bootstrap?.hasPendingTerms ?? false,
    answers: state.answers,
    saveState: state.saveState,
    missing: state.missing,
    submitting: state.submitting,
    consenting: state.consenting,
    focusCode: state.focusCode,
    // derivados
    questions,
    questionItems,
    currentPage,
    page: state.page,
    totalPages,
    isFirstPage,
    isLastPage,
    progress,
    answeredCount,
    totalQuestions,
    // ações
    t,
    selectAnswer,
    acceptTerm,
    submit,
    goNext,
    goBack,
    goToReview,
    goToFirstMissing,
    clearFocusCode,
    retry,
  };
}
