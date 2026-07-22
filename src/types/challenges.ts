export const COMPANY_CHALLENGE_STATUSES = ['joined', 'completed', 'left'] as const;
export const COMPANY_CHALLENGE_MODES = ['content_items', 'sessions', 'days'] as const;

export type CompanyChallengeStatus = typeof COMPANY_CHALLENGE_STATUSES[number];
export type CompanyChallengeMode = typeof COMPANY_CHALLENGE_MODES[number];

export type CompanyChallengeCatalogItem = {
  key: string;
  title: string;
  description: string;
  mode: CompanyChallengeMode;
  target: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type CompanyChallengeParticipationRow = {
  id: string;
  company_id: string;
  user_id: string;
  catalog_key: string;
  status: CompanyChallengeStatus;
  progress: number;
  joined_at: string;
  updated_at: string;
  completed_at: string | null;
  left_at: string | null;
};

export type CompanyChallengeView = CompanyChallengeParticipationRow & {
  challenge: CompanyChallengeCatalogItem;
};
