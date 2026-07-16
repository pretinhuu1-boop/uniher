import { legacyGamificationUnavailable } from '@/lib/gamification/containment';

export async function updateObjectivesProgress(
  _userId: string,
  _companyId: string,
  _triggerType: string,
  _payload?: { campaignId?: string },
): Promise<never> {
  return legacyGamificationUnavailable();
}

export async function createObjective(_data: unknown): Promise<never> {
  return legacyGamificationUnavailable();
}

export function claimObjectiveReward(
  _userId: string,
  _companyId: string,
  _objectiveId: string,
  _weekKey?: string,
): never {
  return legacyGamificationUnavailable();
}
