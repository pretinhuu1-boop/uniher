'use client';
// Renderer de UMA pergunta Likert do COPSOQ41. API-driven.
// ESPELHA o markup/classes acessíveis de QuizQuestion (role=radiogroup/radio).
import { forwardRef } from 'react';
import { t } from '@/hooks/useCopsoq';
import type { CopsoqQuestion as CopsoqQuestionType, Locale } from '@/lib/yavix/copsoq.types';
import styles from '@/components/quiz/QuizQuestion.module.css';

interface CopsoqQuestionProps {
  question: CopsoqQuestionType;
  value: string | undefined;          // value canônico atual ("1".."5"), undefined se não respondida
  onSelect: (value: string) => void;
  locale: Locale;
  /** destaca a pergunta como pendente (ex.: após 422 no submit) */
  isMissing?: boolean;
}

const CopsoqQuestion = forwardRef<HTMLDivElement, CopsoqQuestionProps>(function CopsoqQuestion({
  question,
  value,
  onSelect,
  locale,
  isMissing = false,
}, ref) {
  // ELEMENT/TEXT é informativo — não exige resposta, sem radiogroup.
  if (question.type === 'ELEMENT') {
    return (
      <div className={styles.questionBlock}>
        <p className={styles.questionSub}>{t(question.label, locale)}</p>
      </div>
    );
  }

  const labelText = t(question.label, locale);
  const missingId = `q${question.code}-missing`;

  return (
    <div className={styles.questionBlock}>
      <h3
        className={styles.questionTitle}
        id={`copsoq-q-${question.code}`}
        style={isMissing ? { color: 'var(--rose-500)' } : undefined}
      >
        {labelText}
      </h3>

      {/* pista NÃO-cromática de pendência (ícone + texto), além da cor do título */}
      {isMissing && (
        <p
          id={missingId}
          className={styles.questionSub}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--rose-500)',
            fontWeight: 600,
            margin: '0.25rem 0 0.5rem',
          }}
        >
          <span aria-hidden="true">⚠️</span>
          Pergunta obrigatória — selecione uma opção
        </p>
      )}

      <div className={styles.options}>
        <div
          ref={ref}
          tabIndex={-1}
          className={styles.optionList}
          role="radiogroup"
          aria-labelledby={`copsoq-q-${question.code}`}
          aria-invalid={isMissing}
          aria-describedby={isMissing ? missingId : undefined}
          style={isMissing ? { outline: '2px solid var(--rose-500)', outlineOffset: 4, borderRadius: 'var(--radius-sm)' } : undefined}
        >
          {question.options.map((opt) => {
            const isSelected = value === opt.value;
            const optLabel = t(opt.label, locale);
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.optionBtn} ${isSelected ? styles.optionBtnActive : ''}`}
                onClick={() => onSelect(opt.value)}
                role="radio"
                aria-checked={isSelected}
                aria-label={optLabel}
              >
                <span className={styles.radio}>
                  {isSelected && <span className={styles.radioDot} />}
                </span>
                <span className={styles.optionContent}>
                  <span className={styles.optionLabel}>{optLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default CopsoqQuestion;
