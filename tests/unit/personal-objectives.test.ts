import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { listPersonalObjectiveTemplates } from '@/lib/objectives/catalog';
import { createObjectivesRepository } from '@/repositories/objectives.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createPersonalObjectivesService } from '@/services/personal-objectives.service';

const databases: Database.Database[] = [];
const participationMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '056_eligible_participation_ledger.sql');
const objectivesMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '057_personal_objectives.sql');

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'colaboradora',
      also_collaborator INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id, company_id, name) VALUES
      ('user-a', 'company-a', 'Ana'),
      ('user-b', 'company-b', 'Bruna'),
      ('admin-a', 'company-a', 'Admin');
  `);
  applyMigration(db, '056_eligible_participation_ledger.sql', fs.readFileSync(participationMigrationPath, 'utf8'));
  applyMigration(db, '057_personal_objectives.sql', fs.readFileSync(objectivesMigrationPath, 'utf8'));
  return db;
}

function service(db: Database.Database) {
  return createPersonalObjectivesService(
    createObjectivesRepository(db),
    createParticipationRepository(db),
  );
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('personal objectives wave 6 contract', () => {
  it('starts only approved catalog objectives and writes eligible participation events', () => {
    const db = createDatabase();
    const objectives = service(db);
    const objective = objectives.start({
      actor: { userId: 'user-a', companyId: 'company-a' },
      templateKey: 'weekly-learning',
      objectiveId: 'objective-a',
      now: '2026-07-22T10:00:00.000Z',
    });

    const events = createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
    });

    expect(objective.template.title).toBe(listPersonalObjectiveTemplates()[0].title);
    expect(objective.status).toBe('active');
    expect(events).toMatchObject([
      {
        event_type: 'objective_started',
        source_domain: 'personal_objective',
        source_id: 'objective-a',
        metadata_json: '{}',
      },
    ]);
    expect(JSON.stringify(db.prepare('SELECT * FROM personal_objectives').all())).not.toContain('points');
  });

  it('records progress and completion without exposing another company objectives', () => {
    const db = createDatabase();
    const objectives = service(db);
    objectives.start({
      actor: { userId: 'user-a', companyId: 'company-a' },
      templateKey: 'pause-routine',
      objectiveId: 'objective-a',
      now: '2026-07-22T10:00:00.000Z',
    });
    objectives.progress({
      actor: { userId: 'user-a', companyId: 'company-a' },
      objectiveId: 'objective-a',
      progress: 50,
      now: '2026-07-22T11:00:00.000Z',
    });
    const completed = objectives.complete({
      actor: { userId: 'user-a', companyId: 'company-a' },
      objectiveId: 'objective-a',
      now: '2026-07-22T12:00:00.000Z',
    });

    const companyA = objectives.list({ userId: 'user-a', companyId: 'company-a' });
    const crossCompany = objectives.list({ userId: 'user-a', companyId: 'company-b' });
    const eventTypes = createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
    }).map((event) => event.event_type);

    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(companyA).toHaveLength(1);
    expect(crossCompany).toEqual([]);
    expect(eventTypes.sort()).toEqual([
      'objective_completed',
      'objective_progressed',
      'objective_started',
    ]);
  });

  it('hard-deletes personal objectives during fulfilled user erasure', () => {
    const db = createDatabase();
    service(db).start({
      actor: { userId: 'user-a', companyId: 'company-a' },
      templateKey: 'agenda-review',
      objectiveId: 'objective-a',
      now: '2026-07-22T10:00:00.000Z',
    });

    const removeUser = db.transaction(() => {
      createObjectivesRepository(db).hardDeleteUserObjectivesInCurrentTransaction({
        userId: 'user-a',
        companyId: 'company-a',
      });
      createParticipationRepository(db).hardDeleteUserEventsInCurrentTransaction({
        userId: 'user-a',
        companyId: 'company-a',
        actorId: 'admin-a',
        erasedAt: '2026-07-22T12:00:00.000Z',
      });
      db.prepare("UPDATE users SET deleted_at = '2026-07-22T12:00:00.000Z' WHERE id = 'user-a'").run();
    });
    removeUser.immediate();

    expect(db.prepare('SELECT COUNT(*) AS count FROM personal_objectives').get()).toEqual({ count: 0 });
    expect(createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
      includeRevoked: true,
    })).toEqual([]);
  });
});
