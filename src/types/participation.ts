export const PARTICIPATION_ELIGIBILITY_VERSION = 'participation-v1' as const;

export const ELIGIBLE_PARTICIPATION_EVENTS = [
  'content_completed',
  'objective_started',
  'objective_progressed',
  'objective_completed',
  'challenge_joined',
  'challenge_progressed',
  'challenge_completed',
  'challenge_left',
] as const;

export type EligibleParticipationEvent = typeof ELIGIBLE_PARTICIPATION_EVENTS[number];

export const PARTICIPATION_SOURCE_DOMAINS = [
  'content',
  'personal_objective',
  'company_challenge',
] as const;

export type ParticipationSourceDomain = typeof PARTICIPATION_SOURCE_DOMAINS[number];

export type ParticipationEventRow = {
  id: string;
  event_key: string;
  mutation_id: string;
  company_id: string;
  user_id: string;
  event_type: EligibleParticipationEvent;
  source_domain: ParticipationSourceDomain;
  source_id: string;
  eligibility_version: typeof PARTICIPATION_ELIGIBILITY_VERSION;
  metadata_json: '{}';
  occurred_at: string;
  created_at: string;
};

export type ParticipationRevocationRow = {
  id: string;
  event_id: string;
  company_id: string;
  reason_code: string;
  actor_id: string;
  version: number;
  revoked_at: string;
};

export type ParticipationErasureReceiptRow = {
  id: string;
  company_id: string;
  actor_id: string;
  event_count: number;
  erased_at: string;
};
