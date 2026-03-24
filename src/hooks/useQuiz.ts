'use client';
import { useState, useCallback } from 'react';
import { QuizState } from '@/types';
import { calculateArchetype } from '@/lib/quiz-engine';

const INITIAL_STATE: QuizState = {
  currentQuestion: 0,
  answers: [null, [], null, null, null, null],
  archetype: null,
  screen: 'intro',
};

export function useQuiz() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);

  const setScreen = useCallback((screen: QuizState['screen']) => {
    setState(prev => ({ ...prev, screen }));
  }, []);

  const setAnswer = useCallback((questionIndex: number, value: number) => {
    setState(prev => {
      const newAnswers = [...prev.answers];
      const question = questionIndex;

      if (question === 1) {
        // Multi-select
        const arr = [...(newAnswers[1] as number[])];
        const idx = arr.indexOf(value);
        if (idx > -1) arr.splice(idx, 1);
        else arr.push(value);
        newAnswers[1] = arr;
      } else {
        newAnswers[question] = value;
      }

      return { ...prev, answers: newAnswers };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setState(prev => {
      if (prev.currentQuestion >= 5) {
        const archetype = calculateArchetype(prev.answers);
        return { ...prev, archetype, screen: 'analyzing' };
      }
      return { ...prev, currentQuestion: prev.currentQuestion + 1 };
    });
  }, []);

  const prevQuestion = useCallback(() => {
    setState(prev => {
      if (prev.currentQuestion === 0) {
        return { ...prev, screen: 'intro' };
      }
      return { ...prev, currentQuestion: prev.currentQuestion - 1 };
    });
  }, []);

  const canProceed = useCallback((): boolean => {
    const answer = state.answers[state.currentQuestion];
    if (answer === null) return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  }, [state.answers, state.currentQuestion]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { state, setScreen, setAnswer, nextQuestion, prevQuestion, canProceed, reset };
}
