import type Database from 'better-sqlite3';
import type { CompanyChallengeParticipationRow, CompanyChallengeStatus } from '@/types/challenges';

export type ChallengeActor = {
  userId: string;
  companyId: string;
};

export type InsertCompanyChallengeInput = ChallengeActor & {
  id: string;
  catalogKey: string;
  now: string;
};

export interface ChallengesRepository {
  listByActor(actor: ChallengeActor): CompanyChallengeParticipationRow[];
  findByActor(input: ChallengeActor & { id: string }): CompanyChallengeParticipationRow | undefined;
  insertParticipation(input: InsertCompanyChallengeInput): CompanyChallengeParticipationRow;
  updateProgress(input: ChallengeActor & { id: string; progress: number; now: string }): CompanyChallengeParticipationRow;
  setStatus(input: ChallengeActor & { id: string; status: Exclude<CompanyChallengeStatus, 'joined'>; now: string }): CompanyChallengeParticipationRow;
  hardDeleteUserChallengesInCurrentTransaction(input: ChallengeActor): number;
}

function selectChallenge(database: Database.Database, input: ChallengeActor & { id: string }): CompanyChallengeParticipationRow {
  const row = database.prepare(`
    SELECT *
    FROM user_company_challenges
    WHERE id = @id
      AND user_id = @userId
      AND company_id = @companyId
  `).get(input) as CompanyChallengeParticipationRow | undefined;
  if (!row) throw new Error('Challenge not found');
  return row;
}

export function createChallengesRepository(database: Database.Database): ChallengesRepository {
  return {
    listByActor(actor) {
      return database.prepare(`
        SELECT *
        FROM user_company_challenges
        WHERE user_id = @userId
          AND company_id = @companyId
        ORDER BY
          CASE status WHEN 'joined' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
          updated_at DESC,
          id DESC
      `).all(actor) as CompanyChallengeParticipationRow[];
    },

    findByActor(input) {
      return database.prepare(`
        SELECT *
        FROM user_company_challenges
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).get(input) as CompanyChallengeParticipationRow | undefined;
    },

    insertParticipation(input) {
      database.prepare(`
        INSERT INTO user_company_challenges (
          id, company_id, user_id, catalog_key, status, progress, joined_at, updated_at
        ) VALUES (
          @id, @companyId, @userId, @catalogKey, 'joined', 0, @now, @now
        )
      `).run(input);
      return selectChallenge(database, input);
    },

    updateProgress(input) {
      const current = selectChallenge(database, input);
      if (current.status !== 'joined') throw new Error('Challenge is not joined');
      if (input.progress < current.progress) throw new Error('Challenge progress must be monotonic');

      database.prepare(`
        UPDATE user_company_challenges
        SET progress = @progress,
            updated_at = @now
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).run(input);
      return selectChallenge(database, input);
    },

    setStatus(input) {
      const current = selectChallenge(database, input);
      if (current.status !== 'joined') return current;

      const completedAt = input.status === 'completed' ? input.now : null;
      const leftAt = input.status === 'left' ? input.now : null;
      const progress = input.status === 'completed' ? 100 : current.progress;

      database.prepare(`
        UPDATE user_company_challenges
        SET status = @status,
            progress = @progress,
            updated_at = @now,
            completed_at = @completedAt,
            left_at = @leftAt
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).run({
        ...input,
        progress,
        completedAt,
        leftAt,
      });
      return selectChallenge(database, input);
    },

    hardDeleteUserChallengesInCurrentTransaction(input) {
      const result = database.prepare(`
        DELETE FROM user_company_challenges
        WHERE user_id = @userId
          AND company_id = @companyId
      `).run(input);
      return result.changes;
    },
  };
}
