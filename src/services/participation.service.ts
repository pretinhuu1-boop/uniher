import {
  assertEligibleParticipation,
  createParticipationEventKey,
} from '@/lib/participation/eligibility';
import {
  createParticipationRepository,
  type ParticipationRepository,
} from '@/repositories/participation.repository';
import type {
  EligibleParticipationEvent,
  ParticipationErasureReceiptRow,
  ParticipationEventRow,
  ParticipationRevocationRow,
  ParticipationSourceDomain,
} from '@/types/participation';

export type ParticipationActor = {
  userId: string;
  companyId: string;
};

export type ParticipationMutationInput = {
  actor: ParticipationActor;
  sourceId: string;
  mutationId: string;
  occurredAt?: string;
};

type PersistInput = ParticipationMutationInput & {
  eventType: EligibleParticipationEvent;
  sourceDomain: ParticipationSourceDomain;
};

function persistParticipation(
  repository: ParticipationRepository,
  input: PersistInput,
): ParticipationEventRow {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const eligibility = {
    companyId: input.actor.companyId,
    userId: input.actor.userId,
    eventType: input.eventType,
    sourceDomain: input.sourceDomain,
    sourceId: input.sourceId,
    mutationId: input.mutationId,
    metadata: undefined,
  };
  assertEligibleParticipation(eligibility);
  return repository.insertEvent({
    eventKey: createParticipationEventKey(eligibility),
    mutationId: input.mutationId,
    companyId: input.actor.companyId,
    userId: input.actor.userId,
    eventType: input.eventType,
    sourceDomain: input.sourceDomain,
    sourceId: input.sourceId,
    occurredAt,
  }).event;
}

export function createParticipationService(repository: ParticipationRepository) {
  return {
    recordObjectiveStarted(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'objective_started',
        sourceDomain: 'personal_objective',
      });
    },

    recordObjectiveProgressed(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'objective_progressed',
        sourceDomain: 'personal_objective',
      });
    },

    recordObjectiveCompleted(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'objective_completed',
        sourceDomain: 'personal_objective',
      });
    },

    recordChallengeJoined(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'challenge_joined',
        sourceDomain: 'company_challenge',
      });
    },

    recordChallengeProgressed(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'challenge_progressed',
        sourceDomain: 'company_challenge',
      });
    },

    recordChallengeCompleted(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'challenge_completed',
        sourceDomain: 'company_challenge',
      });
    },

    recordChallengeLeft(input: ParticipationMutationInput) {
      return persistParticipation(repository, {
        ...input,
        eventType: 'challenge_left',
        sourceDomain: 'company_challenge',
      });
    },

    revokeParticipationEvent(input: {
      eventId: string;
      companyId: string;
      actorId: string;
      reasonCode: 'source_reversed' | 'source_deleted' | 'eligibility_error' | 'user_erasure';
      revokedAt?: string;
    }): ParticipationRevocationRow {
      return repository.revokeEvent({
        ...input,
        revokedAt: input.revokedAt ?? new Date().toISOString(),
      });
    },

    hardDeleteUserParticipation(input: {
      userId: string;
      companyId: string;
      actorId: string;
      erasedAt?: string;
    }): ParticipationErasureReceiptRow {
      return repository.hardDeleteUserEvents({
        ...input,
        erasedAt: input.erasedAt ?? new Date().toISOString(),
      });
    },
  };
}
