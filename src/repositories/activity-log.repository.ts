import { legacyGamificationUnavailable } from '@/lib/gamification/containment';

export async function createActivity(_data: { userId: string; action: string }): Promise<never> {
  return legacyGamificationUnavailable();
}

export function getUserActivities(_userId: string, _limit = 50): never {
  return legacyGamificationUnavailable();
}

export function getLatestActivityDate(_userId: string): never {
  return legacyGamificationUnavailable();
}

export function countDailyActivities(_userId: string, _date?: string): never {
  return legacyGamificationUnavailable();
}
