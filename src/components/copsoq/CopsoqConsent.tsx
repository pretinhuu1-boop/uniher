'use client';
// Tela de consentimento (termo NR-1). Acessível.
// ⚠️ O aceite é AÇÃO DA COLABORADORA (clique dela). onAccept dispara POST /consent.
import { useState } from 'react';
import { t } from '@/hooks/useCopsoq';
import type { CopsoqTerm, Locale } from '@/lib/yavix/copsoq.types';
import styles from '@/components/quiz/QuizQuestion.module.css';

interface CopsoqConsentProps {
  term: CopsoqTerm;
  locale: Locale;
  onAccept: (termId: number) => void | Promise<void>;
  submitting?: boolean;
}

export default function CopsoqConsent({ term, locale, onAccept, submitting = false }: CopsoqConsentProps) {
  const [checked, setChecked] = useState(false);
  const canProceed = checked && !submitting;
  const checkboxId = `copsoq-consent-${term.id}`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.questionBlock}>
        <span className={styles.eyebrow}>Avaliação Psicossocial</span>
        <h3 className={styles.questionTitle}>{t(term.title, locale)}</h3>
        <p className={styles.questionSub} style={{ marginTop: '0.75rem', whiteSpace: 'pre-line' }}>
          {t(term.content, locale)}
        </p>
      </div>

      <div className={styles.options}>
        <button
          type="button"
          className={`${styles.optionBtn} ${checked ? styles.optionBtnActive : ''}`}
          onClick={() => setChecked((c) => !c)}
          role="checkbox"
          aria-checked={checked}
          aria-labelledby={checkboxId}
        >
          <span className={styles.checkbox}>
            {checked && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className={styles.optionContent}>
            <span className={styles.optionLabel} id={checkboxId}>
              {term.agreementCheckMessage}
            </span>
          </span>
        </button>
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.nextBtn} ${!canProceed ? styles.nextBtnDisabled : ''}`}
          onClick={() => { void onAccept(term.id); }}
          disabled={!canProceed}
          aria-disabled={!canProceed}
        >
          {submitting ? 'Registrando…' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  );
}
