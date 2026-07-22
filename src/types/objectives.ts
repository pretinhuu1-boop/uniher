export const PERSONAL_OBJECTIVE_STATUSES = ['active', 'completed', 'archived'] as const;

export type PersonalObjectiveStatus = typeof PERSONAL_OBJECTIVE_STATUSES[number];

export type PersonalObjectiveTemplate = {
  key: string;
  title: string;
  description: string;
  cadence: string;
};

export type PersonalObjectiveRow = {
  id: string;
  company_id: string;
  user_id: string;
  template_key: string;
  status: PersonalObjectiveStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

export type PersonalObjectiveView = PersonalObjectiveRow & {
  template: PersonalObjectiveTemplate;
};
