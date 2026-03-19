'use client';
import { useEffect, useRef } from 'react';
import { useQuiz } from '@/hooks/useQuiz';
import QuizErrorBoundary from './QuizErrorBoundary';
import QuizIntro from './QuizIntro';
import QuizQuestion from './QuizQuestion';
import QuizAnalyzing from './QuizAnalyzing';
import QuizResults from './QuizResults';
import styles from './QuizModal.module.css';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuizModal({ isOpen, onClose }: QuizModalProps) {
  const quiz = useQuiz();
  const screenRef = useRef<HTMLDivElement>(null);
  const prevScreen = useRef(quiz.state.screen);

  useEffect(() => {
    if (!isOpen) quiz.reset();
  }, [isOpen]);

  useEffect(() => {
    if (prevScreen.current !== quiz.state.screen && screenRef.current) {
      const el = screenRef.current;
      el.classList.remove(styles.screenEnter);
      void el.offsetWidth;
      el.classList.add(styles.screenEnter);
    }
    prevScreen.current = quiz.state.screen;
  }, [quiz.state.screen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKey);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Diagnóstico UniHER">
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose} aria-label="Fechar diagnóstico">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <QuizErrorBoundary onReset={() => { quiz.reset(); }}>
          <div ref={screenRef} className={styles.screenEnter}>
            {quiz.state.screen === 'intro' && (
              <QuizIntro onStart={() => quiz.setScreen('question')} />
            )}
            {quiz.state.screen === 'question' && (
              <QuizQuestion
                state={quiz.state}
                onAnswer={quiz.setAnswer}
                onNext={quiz.nextQuestion}
                onBack={quiz.prevQuestion}
                canProceed={quiz.canProceed()}
              />
            )}
            {quiz.state.screen === 'analyzing' && (
              <QuizAnalyzing
                archetype={quiz.state.archetype!}
                onComplete={() => quiz.setScreen('results')}
              />
            )}
            {quiz.state.screen === 'results' && (
              <QuizResults archetype={quiz.state.archetype!} />
            )}
          </div>
        </QuizErrorBoundary>
      </div>
    </div>
  );
}
