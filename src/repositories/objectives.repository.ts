import type Database from 'better-sqlite3';
import type { PersonalObjectiveRow, PersonalObjectiveStatus } from '@/types/objectives';

export type ObjectiveActor = {
  userId: string;
  companyId: string;
};

export type InsertPersonalObjectiveInput = ObjectiveActor & {
  id: string;
  templateKey: string;
  now: string;
};

export interface ObjectivesRepository {
  listByActor(actor: ObjectiveActor): PersonalObjectiveRow[];
  findByActor(input: ObjectiveActor & { id: string }): PersonalObjectiveRow | undefined;
  insertPersonalObjective(input: InsertPersonalObjectiveInput): PersonalObjectiveRow;
  updateProgress(input: ObjectiveActor & { id: string; progress: number; now: string }): PersonalObjectiveRow;
  setStatus(input: ObjectiveActor & { id: string; status: Exclude<PersonalObjectiveStatus, 'active'>; now: string }): PersonalObjectiveRow;
  hardDeleteUserObjectivesInCurrentTransaction(input: ObjectiveActor): number;
}

function selectObjective(database: Database.Database, input: ObjectiveActor & { id: string }): PersonalObjectiveRow {
  const row = database.prepare(`
    SELECT *
    FROM personal_objectives
    WHERE id = @id
      AND user_id = @userId
      AND company_id = @companyId
  `).get(input) as PersonalObjectiveRow | undefined;
  if (!row) throw new Error('Objective not found');
  return row;
}

export function createObjectivesRepository(database: Database.Database): ObjectivesRepository {
  return {
    listByActor(actor) {
      return database.prepare(`
        SELECT *
        FROM personal_objectives
        WHERE user_id = @userId
          AND company_id = @companyId
        ORDER BY
          CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
          updated_at DESC,
          id DESC
      `).all(actor) as PersonalObjectiveRow[];
    },

    findByActor(input) {
      return database.prepare(`
        SELECT *
        FROM personal_objectives
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).get(input) as PersonalObjectiveRow | undefined;
    },

    insertPersonalObjective(input) {
      database.prepare(`
        INSERT INTO personal_objectives (
          id, company_id, user_id, template_key, status, progress, created_at, updated_at
        ) VALUES (
          @id, @companyId, @userId, @templateKey, 'active', 0, @now, @now
        )
      `).run(input);
      return selectObjective(database, input);
    },

    updateProgress(input) {
      const current = selectObjective(database, input);
      if (current.status !== 'active') throw new Error('Objective is not active');

      database.prepare(`
        UPDATE personal_objectives
        SET progress = @progress,
            updated_at = @now
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).run(input);
      return selectObjective(database, input);
    },

    setStatus(input) {
      const current = selectObjective(database, input);
      if (current.status !== 'active') return current;

      const completedAt = input.status === 'completed' ? input.now : null;
      const archivedAt = input.status === 'archived' ? input.now : null;
      const progress = input.status === 'completed' ? 100 : current.progress;

      database.prepare(`
        UPDATE personal_objectives
        SET status = @status,
            progress = @progress,
            updated_at = @now,
            completed_at = @completedAt,
            archived_at = @archivedAt
        WHERE id = @id
          AND user_id = @userId
          AND company_id = @companyId
      `).run({
        ...input,
        progress,
        completedAt,
        archivedAt,
      });
      return selectObjective(database, input);
    },

    hardDeleteUserObjectivesInCurrentTransaction(input) {
      const result = database.prepare(`
        DELETE FROM personal_objectives
        WHERE user_id = @userId
          AND company_id = @companyId
      `).run(input);
      return result.changes;
    },
  };
}
