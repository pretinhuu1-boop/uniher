import { useState, useCallback } from 'react';

export function useSubmit<T extends (...args: unknown[]) => Promise<unknown>>(fn: T) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (...args: Parameters<T>) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        return await fn(...args);
      } finally {
        setIsSubmitting(false);
      }
    },
    [fn, isSubmitting]
  );

  return { submit, isSubmitting };
}
