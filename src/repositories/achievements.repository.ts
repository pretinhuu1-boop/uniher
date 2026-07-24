import type Database from 'better-sqlite3';
import type { PrivateAchievementRow, PrivateAchievementStatus } from '@/types/achievements';
import type { EligibleParticipationEvent } from '@/types/participation';

export type AchievementActor = {
  userId: string;
  companyId: string;
};

export type UpsertAchievementInput = AchievementActor & {
  id: string;
  achievementKey: string;
  status: PrivateAchievementStatus;
  progress: number;
  earnedEventId: string | null;
  now: string;
};

export type QualifyingEventRow = {
  id: string;
  event_type: EligibleParticipationEvent;
  occurred_at: string;
};

export interface AchievementsRepository {
  listByActor(actor: AchievementActor): PrivateAchievementRow[];
  listQualifyingEvents(actor: AchievementActor): QualifyingEventRow[];
  upsertAchievement(input: UpsertAchievementInput): PrivateAchievementRow;
  hardDeleteUserAchievementsInCurrentTransaction(input: AchievementActor): number;
}

function selectAchievement(database: Database.Database, input: AchievementActor & { achievementKey: string }): PrivateAchievementRow {
  const row = database.prepare(`
    SELECT *
    FROM private_achievements
    WHERE company_id = @companyId
      AND user_id = @userId
      AND achievement_key = @achievementKey
  `).get(input) as PrivateAchievementRow | undefined;
  if (!row) throw new Error('Achievement was not persisted');
  return row;
}

export function createAchievementsRepository(database: Database.Database): AchievementsRepository {
  return {
    listByActor(actor) {
      return database.prepare(`
        SELECT *
        FROM private_achievements
        WHERE company_id = @companyId
          AND user_id = @userId
        ORDER BY
          CASE status WHEN 'earned' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          updated_at DESC,
          id DESC
      `).all(actor) as PrivateAchievementRow[];
    },

    listQualifyingEvents(actor) {
      return database.prepare(`
        SELECT e.id, e.event_type, e.occurred_at
        FROM eligible_participation_events e
        WHERE e.company_id = @companyId
          AND e.user_id = @userId
          AND e.event_type IN (
            'objective_started',
            'objective_completed',
            'challenge_joined',
            'challenge_completed'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM eligible_participation_event_revocations r
            WHERE r.event_id = e.id
          )
        ORDER BY e.occurred_at ASC, e.id ASC
      `).all(actor) as QualifyingEventRow[];
    },

    upsertAchievement(input) {
      const existing = database.prepare(`
        SELECT status
        FROM private_achievements
        WHERE company_id = @companyId
          AND user_id = @userId
          AND achievement_key = @achievementKey
      `).get(input) as { status: PrivateAchievementStatus } | undefined;

      if (existing?.status === 'revoked' && input.status === 'in_progress') {
        return selectAchievement(database, input);
      }

      database.prepare(`
        INSERT INTO private_achievements (
          id, company_id, user_id, achievement_key, status, progress,
          earned_event_id, created_at, updated_at, earned_at, revoked_at
        ) VALUES (
          @id, @companyId, @userId, @achievementKey, @status, @progress,
          @earnedEventId, @now, @now,
          CASE WHEN @status = 'earned' THEN @now ELSE NULL END,
          CASE WHEN @status = 'revoked' THEN @now ELSE NULL END
        )
        ON CONFLICT(company_id, user_id, achievement_key) DO UPDATE SET
          status = excluded.status,
          progress = excluded.progress,
          earned_event_id = excluded.earned_event_id,
          updated_at = excluded.updated_at,
          earned_at = CASE
            WHEN excluded.status = 'earned' AND private_achievements.earned_at IS NULL THEN excluded.earned_at
            WHEN excluded.status = 'earned' THEN private_achievements.earned_at
            ELSE NULL
          END,
          revoked_at = CASE
            WHEN excluded.status = 'revoked' THEN excluded.revoked_at
            ELSE NULL
          END
      `).run(input);

      const row = selectAchievement(database, input);
      if (existing?.status === 'earned' && input.status === 'in_progress') {
        database.prepare(`
          UPDATE private_achievements
          SET status = 'revoked',
              progress = 0,
              earned_event_id = NULL,
              updated_at = @now,
              revoked_at = @now
          WHERE company_id = @companyId
            AND user_id = @userId
            AND achievement_key = @achievementKey
        `).run(input);
        return selectAchievement(database, input);
      }
      return row;
    },

    hardDeleteUserAchievementsInCurrentTransaction(input) {
      const result = database.prepare(`
        DELETE FROM private_achievements
        WHERE user_id = @userId
          AND company_id = @companyId
      `).run(input);
      return result.changes;
    },
  };
}
