'use client';
// Container do COPSOQ41. Usa useCopsoq e troca entre:
//   consent → form (paginado) → review → done.
// Reusa o shell visual de QuizModal/QuizQuestion onde faz sentido.
import { useEffect, useRef } from 'react';
import { useCopsoq } from '@/hooks/useCopsoq';
import QuizErrorBoundary from '@/components/quiz/QuizErrorBoundary';
import CopsoqConsent from './CopsoqConsent';
import CopsoqQuestion from './CopsoqQuestion';
import type { Locale } from '@/lib/yavix/copsoq.types';
import modal from '@/components/quiz/QuizModal.module.css';
import styles from '@/components/quiz/QuizQuestion.module.css';

interface CopsoqFlowProps {
  locale?: Locale;
}

function SaveIndicator({ saveState }: { saveState: ReturnType<typeof useCopsoq>['saveState'] }) {
  if (saveState === 'idle') return null;
  const map: Record<string, { text: string; color: string }> = {
    saving: { text: 'Salvando…', color: 'var(--text-400)' },
    saved: { text: 'Salvo', color: 'var(--rose-500)' },
    error: { text: 'Erro ao salvar — toque na resposta novamente', color: '#c0392b' },
  };
  const item = map[saveState];
  return (
    <span
      role="status"
      aria-live="polite"
      style={{ fontFamily: 'var(--ff-body)', fontSize: '0.72rem', fontWeight: 600, color: item.color }}
    >
      {item.text}
    </span>
  );
}

export default function CopsoqFlow({ locale = 'pt' }: CopsoqFlowProps) {
  const c = useCopsoq(locale);
  const topRef = useRef<HTMLDivElement>(null);
  // refs dos radiogroups por code (a11y: foco programático na 1ª pendente)
  const questionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // scroll-to-top a cada troca de página/tela (UX em telas longas)
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [c.page, c.screen]);

  // foco programático no radiogroup da 1ª pergunta pendente após goToFirstMissing.
  const { focusCode, clearFocusCode } = c;
  useEffect(() => {
    if (focusCode == null) return;
    const el = questionRefs.current.get(focusCode);
    if (el) el.focus();
    clearFocusCode();
  }, [focusCode, c.page, clearFocusCode]);

  // ── Loading (skeleton simples, não spinner) ────────────────────────────────
  if (c.loading) {
    return (
      <div className={modal.modal}>
        <div className={styles.wrapper} aria-busy="true" aria-label="Carregando questionário">
          <div style={{ height: 24, width: '60%', background: 'var(--cream-200)', borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 14, width: '90%', background: 'var(--cream-200)', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 14, width: '75%', background: 'var(--cream-200)', borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  // ── Erro de carregamento (empty/erro orientador + ação) ─────────────────────
  if (c.error && !c.questions.length && c.screen !== 'done') {
    return (
      <div className={modal.modal}>
        <div className={styles.wrapper} style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }} aria-hidden="true">😕</p>
          <h3 className={styles.questionTitle}>Não foi possível carregar</h3>
          <p className={styles.questionSub} style={{ marginBottom: '1.5rem' }}>{c.error}</p>
          <button type="button" className={styles.nextBtn} onClick={c.retry}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuizErrorBoundary onReset={c.retry}>
      <div className={modal.modal}>
        <div ref={topRef} className={modal.screenEnter} key={`${c.screen}-${c.page}`}>
          {/* ── CONSENT ──────────────────────────────────────────────────── */}
          {c.screen === 'consent' && c.terms[0] && (
            <CopsoqConsent
              term={c.terms[0]}
              locale={c.locale}
              onAccept={(termId) => { void c.acceptTerm(termId); }}
              submitting={c.consenting}
            />
          )}

          {/* ── FORM (paginado) ──────────────────────────────────────────── */}
          {c.screen === 'form' && (
            <div className={styles.wrapper}>
              {/* progresso (só sobre type==='QUESTION') */}
              <div className={styles.progressSection}>
                <div className={styles.progressInfo}>
                  <span className={styles.progressLabel}>
                    {c.answeredCount} de {c.totalQuestions} respondidas · bloco {c.page + 1}/{c.totalPages}
                  </span>
                  <span className={styles.progressPct}>{c.progress}%</span>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${c.progress}%` }} />
                </div>
              </div>

              {/* perguntas do bloco atual */}
              {c.currentPage.map((q) => (
                <CopsoqQuestion
                  key={q.code}
                  ref={(el) => {
                    if (el) questionRefs.current.set(q.code, el);
                    else questionRefs.current.delete(q.code);
                  }}
                  question={q}
                  value={c.answers[q.code]}
                  onSelect={(value) => c.selectAnswer(q.code, value)}
                  locale={c.locale}
                  isMissing={c.missing.includes(q.code)}
                />
              ))}

              {/* indicador salvando/salvo */}
              <div style={{ minHeight: 18, marginBottom: 8, textAlign: 'right' }}>
                <SaveIndicator saveState={c.saveState} />
              </div>

              {/* navegação voltar/avançar */}
              <div className={styles.footer} style={{ display: 'flex', gap: 12 }}>
                {!c.isFirstPage && (
                  <button
                    type="button"
                    className={styles.nextBtn}
                    style={{ background: 'var(--cream-200)', color: 'var(--text-900)', boxShadow: 'none' }}
                    onClick={c.goBack}
                  >
                    Voltar
                  </button>
                )}
                <button type="button" className={styles.nextBtn} onClick={c.goNext}>
                  {c.isLastPage ? 'Revisar' : 'Próximo bloco'}
                </button>
              </div>
            </div>
          )}

          {/* ── REVIEW ───────────────────────────────────────────────────── */}
          {c.screen === 'review' && (
            <div className={styles.wrapper}>
              <div className={styles.questionBlock}>
                <span className={styles.eyebrow}>Revisão</span>
                <h3 className={styles.questionTitle}>Tudo pronto para enviar?</h3>
                <p className={styles.questionSub}>
                  {c.missing.length > 0
                    ? `Faltam ${c.missing.length} pergunta(s). Toque em "Corrigir" para voltar à primeira pendente.`
                    : `Você respondeu ${c.answeredCount} de ${c.totalQuestions} perguntas.`}
                </p>
              </div>

              {c.missing.length > 0 && (
                <div className={styles.options}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {c.missing.map((code) => {
                      const q = c.questions.find((x) => x.code === code);
                      return (
                        <li
                          key={code}
                          style={{
                            fontFamily: 'var(--ff-body)',
                            fontSize: '0.85rem',
                            color: 'var(--text-900)',
                            padding: '0.6rem 0.8rem',
                            border: '1px solid var(--rose-300)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--rose-50)',
                          }}
                        >
                          {q ? c.t(q.label, c.locale) : `Pergunta ${code}`}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {c.error && (
                <p className={styles.questionSub} role="alert" style={{ color: '#c0392b', marginBottom: 8 }}>
                  {c.error}
                </p>
              )}

              <div className={styles.footer} style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className={styles.nextBtn}
                  style={{ background: 'var(--cream-200)', color: 'var(--text-900)', boxShadow: 'none' }}
                  onClick={c.goBack}
                >
                  Voltar
                </button>
                {c.missing.length > 0 ? (
                  <button type="button" className={styles.nextBtn} onClick={() => c.goToFirstMissing(c.missing)}>
                    Corrigir pendências
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.nextBtn} ${c.submitting ? styles.nextBtnDisabled : ''}`}
                    disabled={c.submitting}
                    aria-disabled={c.submitting}
                    onClick={async () => {
                      const res = await c.submit();
                      if (!res.done && res.missing.length > 0) {
                        // 422: rola até a 1ª pendente.
                        c.goToFirstMissing(res.missing);
                      }
                    }}
                  >
                    {c.submitting ? 'Enviando…' : 'Enviar respostas'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── DONE ─────────────────────────────────────────────────────── */}
          {c.screen === 'done' && (
            <div className={styles.wrapper} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden="true">🎉</p>
              <h3 className={styles.questionTitle}>Questionário concluído!</h3>
              <p className={styles.questionSub} style={{ marginBottom: '1.5rem' }}>
                Obrigado por participar da avaliação psicossocial. Suas respostas são confidenciais e nunca entram em ranking.
              </p>
            </div>
          )}
        </div>
      </div>
    </QuizErrorBoundary>
  );
}
