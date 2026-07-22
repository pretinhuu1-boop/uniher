import { legacyGamificationUnavailable } from '@/lib/gamification/containment';

export function getLeagueRanking(_league: string, _weekStart?: string): never {
  return legacyGamificationUnavailable();
}

export function getUserLeagueStatus(_userId: string): never {
  return legacyGamificationUnavailable();
}

export async function processLeagueTransitions(_weekStart: string): Promise<never> {
  return legacyGamificationUnavailable();
}

export function ensureUserInLeague(_userId: string, _league: string): never {
  return legacyGamificationUnavailable();
}
