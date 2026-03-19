'use client';
import { QUESTIONS } from '@/data/questions';
import { QuizState, QuizOption } from '@/types';
import styles from './QuizQuestion.module.css';

interface QuizQuestionProps {
  state: QuizState;
  onAnswer: (questionIndex: number, value: number) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const EYEBROWS = [
  'Autodiagnóstico',
  'Prioridades',
  'Autoavaliação',
  'Motivação',
  'Foco Imediato',
  'Perfil',
];

export default function QuizQuestion({
  state,
  onAnswer,
  onNext,
  onBack,
  canProceed,
}: QuizQuestionProps) {
  const q = QUESTIONS[state.currentQuestion];
  const progress = ((state.currentQuestion + 1) / 6) * 100;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={styles.headerLogo}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="15" stroke="#C85C7E" strokeWidth="1.5" />
            <path
              d="M16 8c-2 2-4 5-4 8s2 6 4 8c2-2 4-5 4-8s-2-6-4-8z"
              fill="#C85C7E"
              opacity="0.15"
              stroke="#C85C7E"
              strokeWidth="1"
            />
          </svg>
          <span className={styles.headerLogoText}>UniHER</span>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressInfo}>
          <span className={styles.progressLabel}>Pergunta {state.currentQuestion + 1} de 6</span>
          <span className={styles.progressPct}>{Math.round(progress)}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className={styles.questionBlock}>
        <span className={styles.eyebrow}>{EYEBROWS[state.currentQuestion]}</span>
        <h3 className={styles.questionTitle}>{q.question}</h3>
        <p className={styles.questionSub}>{q.subtitle}</p>
      </div>

      {/* Options */}
      <div className={styles.options} role="group" aria-label={`Opções para: ${q.question}`}>
        {q.type === 'scale' ? (
          <div className={styles.scaleRow} role="radiogroup" aria-label="Escala de avaliação">
            {(q.options as string[]).map((label, i) => {
              const value = i + 1;
              const isSelected = state.answers[state.currentQuestion] === value;
              return (
                <button
                  key={i}
                  className={`${styles.scaleBtn} ${isSelected ? styles.scaleBtnActive : ''}`}
                  onClick={() => onAnswer(state.currentQuestion, value)}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${value} - ${label}`}
                >
                  <span className={styles.scaleNumber}>{value}</span>
                  <span className={styles.scaleLabel}>{label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.optionList} role={q.type === 'multi' ? 'group' : 'radiogroup'}>
            {(q.options as QuizOption[]).map((opt, i) => {
              const isMulti = q.type === 'multi';
              const currentAnswer = state.answers[state.currentQuestion];
              const isSelected = isMulti
                ? (currentAnswer as number[]).includes(i)
                : currentAnswer === i;

              return (
                <button
                  key={i}
                  className={`${styles.optionBtn} ${isSelected ? styles.optionBtnActive : ''}`}
                  onClick={() => onAnswer(state.currentQuestion, i)}
                  role={isMulti ? 'checkbox' : 'radio'}
                  aria-checked={isSelected}
                >
                  <span className={isMulti ? styles.checkbox : styles.radio}>
                    {isSelected && (
                      isMulti ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span className={styles.radioDot} />
                      )
                    )}
                  </span>
                  <span className={styles.optionContent}>
                    <span className={styles.optionLabel}>{opt.label}</span>
                    {opt.description && (
                      <span className={styles.optionDesc}>{opt.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Button */}
      <div className={styles.footer}>
        <button
          className={`${styles.nextBtn} ${!canProceed ? styles.nextBtnDisabled : ''}`}
          onClick={onNext}
          disabled={!canProceed}
        >
          {state.currentQuestion >= 5 ? 'Ver resultado' : 'Próximo passo'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
