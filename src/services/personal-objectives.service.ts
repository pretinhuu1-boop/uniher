import { nanoid } from 'nanoid';
import { getPersonalObjectiveTemplate } from '@/lib/objectives/catalog';
import type { ParticipationActor } from '@/services/participation.service';
import type { ParticipationRepository } from '@/repositories/participation.repository';
import { createParticipationService } from '@/services/participation.service';
import type { ObjectivesRepository } from '@/repositories/objectives.repository';
import type { PersonalObjectiveView } from '@/types/objectives';

function mutationId(objectiveId: string, action: string): string {
  return `personal-objective:${objectiveId}:${action}`;
}

function toView(row: ReturnType<ObjectivesRepository['listByActor']>[number]): PersonalObjectiveView {
  const template = getPersonalObjectiveTemplate(row.template_key);
  if (!template) throw new Error('Objective template not approved');
  return { ...row, template };
}

export function createPersonalObjectivesService(
  objectivesRepository: ObjectivesRepository,
  participationRepository: ParticipationRepository,
) {
  const participation = createParticipationService(participationRepository);

  return {
    list(actor: ParticipationActor): PersonalObjectiveView[] {
      return objectivesRepository.listByActor(actor).map(toView);
    },

    start(input: { actor: ParticipationActor; templateKey: string; objectiveId?: string; now?: string }): PersonalObjectiveView {
      const template = getPersonalObjectiveTemplate(input.templateKey);
      if (!template) throw new Error('Objective template not approved');

      const now = input.now ?? new Date().toISOString();
      const id = input.objectiveId ?? nanoid();
      const objective = objectivesRepository.insertPersonalObjective({
        id,
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        templateKey: input.templateKey,
        now,
      });
      participation.recordObjectiveStarted({
        actor: input.actor,
        sourceId: objective.id,
        mutationId: mutationId(objective.id, 'started'),
        occurredAt: now,
      });
      return toView(objective);
    },

    progress(input: { actor: ParticipationActor; objectiveId: string; progress: number; now?: string }): PersonalObjectiveView {
      if (!Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100) {
        throw new Error('Objective progress must be an integer from 0 to 100');
      }

      const current = objectivesRepository.findByActor({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.objectiveId,
      });
      if (!current) throw new Error('Objective not found');

      const now = input.now ?? new Date().toISOString();
      const updated = objectivesRepository.updateProgress({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.objectiveId,
        progress: input.progress,
        now,
      });

      if (input.progress !== current.progress && input.progress > 0) {
        participation.recordObjectiveProgressed({
          actor: input.actor,
          sourceId: input.objectiveId,
          mutationId: mutationId(input.objectiveId, `progress-${input.progress}`),
          occurredAt: now,
        });
      }

      return toView(updated);
    },

    complete(input: { actor: ParticipationActor; objectiveId: string; now?: string }): PersonalObjectiveView {
      const current = objectivesRepository.findByActor({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.objectiveId,
      });
      if (!current) throw new Error('Objective not found');
      if (current.status !== 'active') throw new Error('Objective is not active');

      const now = input.now ?? new Date().toISOString();
      const completed = objectivesRepository.setStatus({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.objectiveId,
        status: 'completed',
        now,
      });
      participation.recordObjectiveCompleted({
        actor: input.actor,
        sourceId: input.objectiveId,
        mutationId: mutationId(input.objectiveId, 'completed'),
        occurredAt: now,
      });
      return toView(completed);
    },

    archive(input: { actor: ParticipationActor; objectiveId: string; now?: string }): PersonalObjectiveView {
      const now = input.now ?? new Date().toISOString();
      return toView(objectivesRepository.setStatus({
        companyId: input.actor.companyId,
        userId: input.actor.userId,
        id: input.objectiveId,
        status: 'archived',
        now,
      }));
    },
  };
}
