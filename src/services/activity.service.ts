import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

export interface ActivityResult {
  status: typeof LEGACY_GAMIFICATION_STATE.status;
  reason: typeof LEGACY_GAMIFICATION_STATE.reason;
}

/** Legacy generic activity writes are quarantined until an eligible ledger exists. */
export async function recordActivity(): Promise<ActivityResult> {
  return {
    status: LEGACY_GAMIFICATION_STATE.status,
    reason: LEGACY_GAMIFICATION_STATE.reason,
  };
}

/** Legacy challenge progress is not a safe mission action. */
export async function updateChallengeProgress(): Promise<ActivityResult> {
  return recordActivity();
}
