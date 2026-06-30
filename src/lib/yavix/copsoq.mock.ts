// ─────────────────────────────────────────────────────────────────────────────
// Mock do COPSOQ41 (YAVIX_MOCK=1) — SPEC_YAVIX_COPSOQ_PROXY.md §7.
// Dataset fixo + store em memória do processo (Map por userId).
// Sem libs externas. Tudo tipado por copsoq.types.ts.
//
// ⚠️ O mock simula o PROXY: o cálculo de optionIndex (0-based) a partir do
//    value (1-based) e o snapshot das opções acontecem AQUI, no servidor —
//    nunca no front-end.
// ⚠️ PII: este store guarda respostas (dado sensível de saúde mental).
//    Nunca logar o conteúdo. É apenas memória de processo, volátil.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CopsoqBootstrap,
  CopsoqOption,
  CopsoqQuestion,
  CopsoqSavedAnswer,
  CopsoqTerm,
} from './copsoq.types';

// ── Escala COPSOQ padrão (Sempre → Nunca), value "5".."1", pt/en/es ──────────
// Observação: a escala COPSOQ frequentemente decresce de frequência;
// mantemos value canônico como string "1".."5" conforme a definição Yavix.
const ESCALA_FREQUENCIA: CopsoqOption[] = [
  { value: '5', label: { pt: 'Sempre', en: 'Always', es: 'Siempre' } },
  { value: '4', label: { pt: 'Muitas vezes', en: 'Often', es: 'Muchas veces' } },
  { value: '3', label: { pt: 'Às vezes', en: 'Sometimes', es: 'A veces' } },
  { value: '2', label: { pt: 'Raramente', en: 'Rarely', es: 'Raramente' } },
  { value: '1', label: { pt: 'Nunca', en: 'Never', es: 'Nunca' } },
];

function q(
  code: number,
  pt: string,
  en: string,
  es: string,
  priority: number,
): CopsoqQuestion {
  return {
    code,
    type: 'QUESTION',
    component: 'RADIO_GROUP',
    label: { pt, en, es },
    options: ESCALA_FREQUENCIA.map((o) => ({ ...o, label: { ...o.label } })),
    priority,
  };
}

// ── Definição do formulário (~12 perguntas: 11 QUESTION + 1 ELEMENT/TEXT) ─────
const QUESTIONS: CopsoqQuestion[] = [
  // Bloco informativo (ELEMENT/TEXT) — não conta no progresso nem no submit.
  {
    code: 1,
    type: 'ELEMENT',
    component: 'TEXT',
    label: {
      pt: 'As próximas perguntas são sobre o seu trabalho no último mês. Responda com sinceridade — suas respostas são confidenciais.',
      en: 'The next questions are about your work over the last month. Answer honestly — your responses are confidential.',
      es: 'Las siguientes preguntas son sobre su trabajo en el último mes. Responda con sinceridad — sus respuestas son confidenciales.',
    },
    options: [],
    priority: 0,
  },
  q(2, 'O seu trabalho exige que você trabalhe muito rapidamente?', 'Does your work require you to work very fast?', '¿Su trabajo exige que trabaje muy rápido?', 1),
  q(3, 'A sua carga de trabalho acumula-se por ser mal distribuída?', 'Does your workload pile up because it is poorly distributed?', '¿Su carga de trabajo se acumula por estar mal distribuida?', 2),
  q(4, 'Você tem influência sobre o que faz no seu trabalho?', 'Do you have influence over what you do at work?', '¿Tiene influencia sobre lo que hace en su trabajo?', 3),
  q(5, 'O seu trabalho tem um significado para você?', 'Does your work have meaning for you?', '¿Su trabajo tiene un significado para usted?', 4),
  q(6, 'Você recebe ajuda e apoio dos seus colegas?', 'Do you receive help and support from your colleagues?', '¿Recibe ayuda y apoyo de sus colegas?', 5),
  q(7, 'A sua chefia imediata reconhece e valoriza o seu trabalho?', 'Does your immediate manager recognize and value your work?', '¿Su jefe inmediato reconoce y valora su trabajo?', 6),
  q(8, 'Você se sente esgotada(o) no fim de um dia de trabalho?', 'Do you feel worn out at the end of a working day?', '¿Se siente agotada(o) al final de un día de trabajo?', 7),
  q(9, 'Você tem dificuldade para dormir por causa do trabalho?', 'Do you have trouble sleeping because of work?', '¿Tiene dificultad para dormir a causa del trabajo?', 8),
  q(10, 'No seu local de trabalho, você foi exposta(o) a comportamentos ofensivos?', 'At your workplace, have you been exposed to offensive behaviors?', '¿En su lugar de trabajo, ha sido expuesta(o) a comportamientos ofensivos?', 9),
  q(11, 'Você confia nas informações que vêm da direção da empresa?', 'Do you trust the information coming from management?', '¿Confía en la información que viene de la dirección?', 10),
  q(12, 'De um modo geral, você está satisfeita(o) com o seu trabalho?', 'Overall, are you satisfied with your job?', 'En general, ¿está satisfecha(o) con su trabajo?', 11),
];

// ── Termo pendente (1) ───────────────────────────────────────────────────────
const TERMS: CopsoqTerm[] = [
  {
    id: 9001, // formConfigId do PUT /terms/update
    title: {
      pt: 'Termo de Consentimento — Avaliação Psicossocial (NR-1)',
      en: 'Consent Term — Psychosocial Assessment (NR-1)',
      es: 'Término de Consentimiento — Evaluación Psicosocial (NR-1)',
    },
    content: {
      pt: 'Este questionário avalia fatores de risco psicossocial no trabalho, conforme a NR-1. Sua participação é voluntária e suas respostas são tratadas de forma confidencial e agregada. Você pode interromper a qualquer momento.',
      en: 'This questionnaire assesses psychosocial risk factors at work under NR-1. Your participation is voluntary and your responses are handled confidentially and in aggregate. You may stop at any time.',
      es: 'Este cuestionario evalúa factores de riesgo psicosocial en el trabajo según la NR-1. Su participación es voluntaria y sus respuestas se tratan de forma confidencial y agregada. Puede interrumpir en cualquier momento.',
    },
    agreementCheckMessage: 'Li e concordo em participar da avaliação psicossocial.',
    version: 1,
  },
];

// ── Store em memória do processo (Map por userId) ────────────────────────────

interface MockSession {
  sessionId: string;
  status: 'DRAFT' | 'DONE';
  termAccepted: boolean;
  answers: Map<number, CopsoqSavedAnswer>; // code -> answer
}

const STORE = new Map<string, MockSession>();

function newSessionId(userId: string): string {
  // ID opaco e estável por sessão (não derivável de PII no FE).
  return `mock-${userId.slice(0, 8)}-${Date.now().toString(36)}`;
}

/** Garante uma sessão inicializada para o userId (idempotente). */
export function getOrInit(userId: string): MockSession {
  let session = STORE.get(userId);
  if (!session) {
    session = {
      sessionId: newSessionId(userId),
      status: 'DRAFT',
      termAccepted: false,
      answers: new Map(),
    };
    STORE.set(userId, session);
  }
  return session;
}

/**
 * Monta o CopsoqBootstrap (resposta de GET /bootstrap).
 * `_sessionId` é o id de retomada enviado pelo FE; o mock o IGNORA (chaveia por
 * userId). TODO(Onda 3): usar para identificar a sessão Yavix (formSessionId).
 */
export function buildBootstrap(
  userId: string,
  locale: 'pt' | 'en' | 'es' = 'pt',
  _sessionId?: string,
): CopsoqBootstrap {
  const session = getOrInit(userId);
  const answers: Record<string, CopsoqSavedAnswer> = {};
  for (const [code, ans] of session.answers) {
    answers[`question${code}`] = ans;
  }
  const hasPendingTerms = !session.termAccepted;
  return {
    sessionId: session.sessionId,
    status: session.status,
    formName: 'COPSOQ41',
    hasPendingTerms,
    terms: hasPendingTerms ? TERMS.map((t) => ({ ...t })) : [],
    questions: QUESTIONS.map((qq) => ({
      ...qq,
      label: { ...qq.label },
      options: qq.options.map((o) => ({ ...o, label: { ...o.label } })),
    })),
    answers,
    locale,
  };
}

export interface SaveAnswerResult {
  ok: boolean;
  reason?: 'UNKNOWN_CODE' | 'NOT_A_QUESTION' | 'INVALID_VALUE';
}

/**
 * Salva uma resposta. O FE manda apenas {code, value}; o PROXY/mock resolve
 * optionIndex (0-based) procurando a opção cujo value === value e grava o
 * value canônico. Índice 1-based(value) / 0-based(optionIndex): resolvido AQUI.
 */
export function saveAnswer(userId: string, code: number, value: string): SaveAnswerResult {
  const session = getOrInit(userId);
  const def = QUESTIONS.find((qq) => qq.code === code);
  if (!def) return { ok: false, reason: 'UNKNOWN_CODE' };
  if (def.type !== 'QUESTION') return { ok: false, reason: 'NOT_A_QUESTION' };

  const optionIndex = def.options.findIndex((o) => o.value === value);
  if (optionIndex < 0) return { ok: false, reason: 'INVALID_VALUE' };

  // NB: o snapshot `option[]` completo do payload Yavix (PATCH /form/{sessionId})
  // é responsabilidade do wiring real (Onda 3); o mock persiste só CopsoqSavedAnswer.
  session.answers.set(code, { code, optionIndex, value });
  return { ok: true };
}

/** Registra o aceite do termo (ação da colaboradora). */
export function acceptTerm(userId: string, termId: number): { ok: boolean; reason?: 'UNKNOWN_TERM' | 'ALREADY_ACCEPTED' } {
  const session = getOrInit(userId);
  const term = TERMS.find((t) => t.id === termId);
  if (!term) return { ok: false, reason: 'UNKNOWN_TERM' };
  if (session.termAccepted) return { ok: false, reason: 'ALREADY_ACCEPTED' };
  session.termAccepted = true;
  return { ok: true };
}

export interface SubmitResult {
  done: boolean;
  missing: number[]; // codes de QUESTION sem resposta
}

/** Valida completude (todas as QUESTION respondidas) e finaliza se completo. */
export function submit(userId: string): SubmitResult {
  const session = getOrInit(userId);
  // Idempotência: sessão já finalizada não é re-mutada nem reprocessada (defesa em
  // profundidade para o crédito one-shot de gamificação). Ver SPEC §9 (reabertura = Onda 0).
  if (session.status === 'DONE') {
    return { done: true, missing: [] };
  }
  const required = QUESTIONS.filter((qq) => qq.type === 'QUESTION');
  const missing = required
    .filter((qq) => !session.answers.has(qq.code))
    .map((qq) => qq.code)
    .sort((a, b) => a - b);

  if (missing.length > 0) {
    return { done: false, missing };
  }
  session.status = 'DONE';
  return { done: true, missing: [] };
}
