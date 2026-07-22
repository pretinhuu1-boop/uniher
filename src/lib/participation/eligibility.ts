import { createHash } from 'crypto';
import {
  ELIGIBLE_PARTICIPATION_EVENTS,
  PARTICIPATION_ELIGIBILITY_VERSION,
  PARTICIPATION_SOURCE_DOMAINS,
  type EligibleParticipationEvent,
  type ParticipationSourceDomain,
} from '@/types/participation';

export const PARTICIPATION_EVENT_RETENTION_DAYS_AFTER_CLOSE = 90;

export const FORBIDDEN_PARTICIPATION_SOURCES = Object.freeze([
  'check_in',
  'mood',
  'semaforo',
  'nr1',
  'exam',
  'appointment',
  'psychology',
  'denunciation',
  'health',
  'health_score',
  'health_scores',
  'agenda',
  'league',
  'ranking',
  'points',
  'badge',
  'badges',
] as const);

export const PARTICIPATION_EVENT_SOURCE = Object.freeze({
  content_completed: 'content',
  objective_started: 'personal_objective',
  objective_progressed: 'personal_objective',
  objective_completed: 'personal_objective',
  challenge_joined: 'company_challenge',
  challenge_progressed: 'company_challenge',
  challenge_completed: 'company_challenge',
  challenge_left: 'company_challenge',
} satisfies Record<EligibleParticipationEvent, ParticipationSourceDomain>);

export type ParticipationEligibilityInput = {
  companyId: string;
  userId: string;
  eventType: string;
  sourceDomain: string;
  sourceId: string;
  mutationId: string;
  metadata?: Record<string, unknown>;
};

export type ParticipationEventKeyInput = Omit<ParticipationEligibilityInput, 'metadata'>;

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function isEligibleParticipationEvent(value: string): value is EligibleParticipationEvent {
  return (ELIGIBLE_PARTICIPATION_EVENTS as readonly string[]).includes(value);
}

export function isParticipationSourceDomain(value: string): value is ParticipationSourceDomain {
  return (PARTICIPATION_SOURCE_DOMAINS as readonly string[]).includes(value);
}

export function assertEligibleParticipation(input: ParticipationEligibilityInput): asserts input is ParticipationEligibilityInput & {
  eventType: EligibleParticipationEvent;
  sourceDomain: ParticipationSourceDomain;
  metadata?: Record<string, never>;
} {
  const required = [input.companyId, input.userId, input.eventType, input.sourceDomain, input.sourceId, input.mutationId];
  if (!required.every(nonEmpty)) {
    throw new Error('Participation event requires company, user, event, source and mutation identifiers');
  }

  const source = normalize(input.sourceDomain);
  if ((FORBIDDEN_PARTICIPATION_SOURCES as readonly string[]).includes(source)) {
    throw new Error(`Forbidden participation source: ${input.sourceDomain}`);
  }
  if (!isEligibleParticipationEvent(input.eventType)) {
    throw new Error(`Unsupported participation event: ${input.eventType}`);
  }
  if (!isParticipationSourceDomain(input.sourceDomain)) {
    throw new Error(`Unsupported participation source domain: ${input.sourceDomain}`);
  }
  if (PARTICIPATION_EVENT_SOURCE[input.eventType] !== input.sourceDomain) {
    throw new Error(`Participation event ${input.eventType} cannot be produced by ${input.sourceDomain}`);
  }
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    throw new Error('Participation metadata is disabled in v1');
  }
}

export function createParticipationEventKey(input: ParticipationEventKeyInput): string {
  assertEligibleParticipation({ ...input, metadata: undefined });
  return createHash('sha256')
    .update([
      PARTICIPATION_ELIGIBILITY_VERSION,
      input.companyId,
      input.userId,
      input.eventType,
      input.sourceDomain,
      input.sourceId,
      input.mutationId,
    ].join('\x1f'))
    .digest('hex');
}
