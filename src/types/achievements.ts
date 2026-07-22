import type { EligibleParticipationEvent } from '@/types/participation';

export const PRIVATE_ACHIEVEMENT_STATUSES = ['in_progress', 'earned', 'revoked'] as const;

export type PrivateAchievementStatus = typeof PRIVATE_ACHIEVEMENT_STATUSES[number];

export type PrivateAchievementCatalogItem = {
  key: string;
  title: string;
  description: string;
  requiredEvent: EligibleParticipationEvent;
};

export type PrivateAchievementRow = {
  id: string;
  company_id: string;
  user_id: string;
  achievement_key: string;
  status: PrivateAchievementStatus;
  progress: number;
  earned_event_id: string | null;
  created_at: string;
  updated_at: string;
  earned_at: string | null;
  revoked_at: string | null;
};

export type PrivateAchievementView = PrivateAchievementRow & {
  achievement: PrivateAchievementCatalogItem;
};
