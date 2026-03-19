import { ArchetypeKey } from '@/types';
import { ARCHETYPES } from '@/data/archetypes';

export function calculateArchetype(answers: (number | number[] | null)[]): ArchetypeKey {
  const barrier = answers[0] as number;
  const scale = answers[2] as number;

  if (scale >= 4 || barrier === 4) return 'guerreira';
  if (answers[4] === 5) return 'equilibrista';
  if (barrier === 1) return 'protetora';
  return 'guardia';
}

export function getProjection(key: ArchetypeKey, days: 30 | 60 | 90): number[] {
  const arch = ARCHETYPES[key];
  const growth = days === 30 ? arch.growth30 : days === 60 ? arch.growth60 : arch.growth90;
  return arch.base.map((b, i) => Math.min(9.9, Math.max(0.1, b + growth[i])));
}

export function averageScore(scores: number[]): string {
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}
