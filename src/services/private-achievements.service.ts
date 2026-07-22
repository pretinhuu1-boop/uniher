import { nanoid } from 'nanoid';
import { getPrivateAchievementCatalogItem, listPrivateAchievementCatalog } from '@/lib/achievements/catalog';
import type { AchievementsRepository, QualifyingEventRow } from '@/repositories/achievements.repository';
import type { ParticipationActor } from '@/services/participation.service';
import type { PrivateAchievementCatalogItem, PrivateAchievementView } from '@/types/achievements';

function toView(row: ReturnType<AchievementsRepository['listByActor']>[number]): PrivateAchievementView {
  const achievement = getPrivateAchievementCatalogItem(row.achievement_key);
  if (!achievement) throw new Error('Achievement catalog item not approved');
  return { ...row, achievement };
}

function findEvent(
  events: QualifyingEventRow[],
  achievement: PrivateAchievementCatalogItem,
): QualifyingEventRow | undefined {
  return events.find((event) => event.event_type === achievement.requiredEvent);
}

export function createPrivateAchievementsService(repository: AchievementsRepository) {
  return {
    sync(actor: ParticipationActor, now = new Date().toISOString()): PrivateAchievementView[] {
      const events = repository.listQualifyingEvents(actor);
      for (const achievement of listPrivateAchievementCatalog()) {
        const event = findEvent(events, achievement);
        repository.upsertAchievement({
          id: nanoid(),
          companyId: actor.companyId,
          userId: actor.userId,
          achievementKey: achievement.key,
          status: event ? 'earned' : 'in_progress',
          progress: event ? 100 : 0,
          earnedEventId: event?.id ?? null,
          now,
        });
      }
      return repository.listByActor(actor).map(toView);
    },
  };
}
