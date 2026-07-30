import { describe, expect, it } from 'vitest';
import { calculateArchetype, calculateInitialHealthScore } from '@/lib/quiz/engine';

describe('onboarding quiz engine', () => {
  it('keeps zero-valued slider answers instead of replacing them with defaults', () => {
    const scores = calculateInitialHealthScore([25, 25, 0, 25, 25, 25]);
    const byDimension = Object.fromEntries(scores.map((item) => [item.dimension, item.score]));

    expect(byDimension.Prevenção).toBe(0);
    expect(byDimension.Sono).toBe(25);
    expect(byDimension.Energia).toBe(25);
    expect(byDimension['Saúde Mental']).toBe(25);
    expect(byDimension.Hábitos).toBe(25);
    expect(byDimension.Engajamento).toBe(100);
  });

  it('maps the Semaforo onboarding sliders to the platform archetype flow', () => {
    const result = calculateArchetype([25, 25, 0, 25, 25, 25]);

    expect(result.key).toBe('guardia');
    expect(result.score).toBe(25);
  });
});
