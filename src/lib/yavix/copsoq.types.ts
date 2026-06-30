// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartilhados do COPSOQ41 (integração Yavix, arquitetura A2 "embutido").
// FONTE DA VERDADE — SPEC_YAVIX_COPSOQ_PROXY.md §3. FE e mock importam DAQUI.
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = 'pt' | 'en' | 'es';
export type I18nText = Partial<Record<Locale, string>>; // 'pt' sempre presente (fallback)
export type CopsoqStatus = 'DRAFT' | 'DONE';

export interface CopsoqOption {
  /** valor canônico vindo da Yavix (string "1".."5") */
  value: string;
  label: I18nText;
}

export interface CopsoqQuestion {
  code: number;                       // 1..120
  type: 'QUESTION' | 'ELEMENT';       // só QUESTION exige resposta
  component: 'RADIO_GROUP' | 'TEXT';
  label: I18nText;
  options: CopsoqOption[];            // vazio quando type=ELEMENT
  priority: number;
}

/** estado já respondido de uma pergunta (espelha GET /form/answers) */
export interface CopsoqSavedAnswer {
  code: number;
  optionIndex: number;                // 0-based
  value: string;                      // "1".."5"
}

export interface CopsoqBootstrap {
  sessionId: string;                  // formSessionId (opaco p/ o FE)
  status: CopsoqStatus;
  formName: 'COPSOQ41';
  hasPendingTerms: boolean;
  terms: CopsoqTerm[];                // [] se não houver pendência
  questions: CopsoqQuestion[];        // definição completa do formulário
  answers: Record<string, CopsoqSavedAnswer>; // chave "question{code}"
  locale: Locale;
}

export interface CopsoqTerm {
  id: number;                         // = formConfigId do PUT /terms/update
  title: I18nText;
  content: I18nText;
  agreementCheckMessage: string;
  version: number;
}

/** o FE manda SÓ isto ao salvar uma resposta */
export interface CopsoqAnswerInput {
  code: number;                       // 1..120, type=QUESTION
  value: string;                      // value canônico da opção escolhida ("1".."5")
}

export interface CopsoqSubmitResult {
  status: 'DONE';
  // Recompensa de PARTICIPAÇÃO (derivada do ATO de concluir, nunca do conteúdo/score).
  // INVARIANTE LGPD: NUNCA adicionar aqui answers/optionIndex/value/score/dimensão.
  xpEarned?: number;
  alreadyAwarded?: boolean;
}

/** 422 no submit quando incompleto */
export interface CopsoqIncomplete {
  error: 'INCOMPLETE';
  missing: number[];                  // codes de QUESTION sem resposta
}
