import { nanoid } from 'nanoid';
import { getCompanyChallengeCatalogItem, listCompanyChallengeCatalog } from '@/lib/challenges/catalog';
import type { ParticipationActor } from '@/services/participation.service';
import type { ParticipationRepository } from '@/repositories/participation.repository';
import { createParticipationService } from '@/services/participation.service';
import type { ChallengesRepository } from '@/repositories/challenges.repository';
import type { CompanyChallengeView } from '@/types/challenges';

function mutationId(challengeId: string, action: string): string {
  return `company-challenge:${challengeId}:${action}`;
}

function toView(row: ReturnType<ChallengesRepository['listByActor']>[number]): CompanyChallengeView {
  const challenge = getCompanyChallengeCatalogItem(row.catalog_key);
  if (!challenge?.isActive) throw new Error('Challenge catalog item not approved');
  return { ...row, challenge };
}

export function createCompanyChallengesService(
  challengesRepository: ChallengesRepository,
  participationRepository: ParticipationRepository,
) {
  const participation = createParticipationService(participationRepository);

  return {
    list(actor: ParticipationActor): { catalog: ReturnType<typeof listCompanyChallengeCatalog>; challenges: CompanyChallengeView[] } {
      return {
        catalog: listCompanyChallengeCatalog().filter((challenge) => challenge.isActive),
        challenges: challengesRepository.listByActor(actor).map(toView),
      };
    },

    join(input: { actor: ParticipationActor; catalogKey: string; challengeId?: string; now?: string }): CompanyChallengeView {
      const challenge = getCompanyChallengeCatalogItem(input.catalogKey);
      if (!challenge?.isActive) throw new Error('Challenge catalog item not approved');

      const now = input.now ?? new Date().toISOString();
      const id = input.challengeId ?? nanoid();
      const participationRow = challengesRepository.insertParticipation({
        id,
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        catalogKey: input.catalogKey,
        now,
      });
      participation.recordChallengeJoined({
        actor: input.actor,
        sourceId: participationRow.id,
        mutationId: mutationId(participationRow.id, 'joined'),
        occurredAt: now,
      });
      return toView(participationRow);
    },

    progress(input: { actor: ParticipationActor; challengeId: string; progress: number; now?: string }): CompanyChallengeView {
      if (!Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100) {
        throw new Error('Challenge progress must be an integer from 0 to 100');
      }

      const current = challengesRepository.findByActor({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
      });
      if (!current) throw new Error('Challenge not found');

      const now = input.now ?? new Date().toISOString();
      const updated = challengesRepository.updateProgress({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
        progress: input.progress,
        now,
      });

      if (input.progress !== current.progress && input.progress > 0) {
        participation.recordChallengeProgressed({
          actor: input.actor,
          sourceId: input.challengeId,
          mutationId: mutationId(input.challengeId, `progress-${input.progress}`),
          occurredAt: now,
        });
      }

      return toView(updated);
    },

    complete(input: { actor: ParticipationActor; challengeId: string; now?: string }): CompanyChallengeView {
      const current = challengesRepository.findByActor({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
      });
      if (!current) throw new Error('Challenge not found');
      if (current.status !== 'joined') throw new Error('Challenge is not joined');

      const now = input.now ?? new Date().toISOString();
      const completed = challengesRepository.setStatus({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
        status: 'completed',
        now,
      });
      participation.recordChallengeCompleted({
        actor: input.actor,
        sourceId: input.challengeId,
        mutationId: mutationId(input.challengeId, 'completed'),
        occurredAt: now,
      });
      return toView(completed);
    },

    leave(input: { actor: ParticipationActor; challengeId: string; now?: string }): CompanyChallengeView {
      const current = challengesRepository.findByActor({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
      });
      if (!current) throw new Error('Challenge not found');
      if (current.status !== 'joined') throw new Error('Challenge is not joined');

      const now = input.now ?? new Date().toISOString();
      const left = challengesRepository.setStatus({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.challengeId,
        status: 'left',
        now,
      });
      participation.recordChallengeLeft({
        actor: input.actor,
        sourceId: input.challengeId,
        mutationId: mutationId(input.challengeId, 'left'),
        occurredAt: now,
      });
      return toView(left);
    },
  };
}
