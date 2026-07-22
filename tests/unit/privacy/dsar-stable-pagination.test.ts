import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { createAchievementsRepository } from '@/repositories/achievements.repository';
import { createDsarExportJsonChunks } from '@/lib/privacy/dsar-export';
import { createChallengesRepository } from '@/repositories/challenges.repository';
import { createObjectivesRepository } from '@/repositories/objectives.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createCompanyChallengesService } from '@/services/company-challenges.service';
import { createPrivateAchievementsService } from '@/services/private-achievements.service';
import { createPersonalObjectivesService } from '@/services/personal-objectives.service';
import { createParticipationService } from '@/services/participation.service';

type StableCollection = 'quiz_results' | 'user_badges' | 'user_challenges';

type DsarPayload = {
  quizResults: Array<{ id: string }>;
  eligibleParticipation: {
    events: Array<{ id: string; source_id: string }>;
    revocations: Array<{ id: string; event_id: string; reason_code: string }>;
  };
  personalObjectives: Array<{ id: string; template_key: string; status: string; progress: number }>;
  companyChallenges: Array<{ id: string; catalog_key: string; status: string; progress: number }>;
  privateAchievements: Array<{ id: string; achievement_key: string; status: string; progress: number }>;
  legacyDerivedData: {
    badges: Array<{ badge_id: string }>;
    challenges: Array<{ challenge_id: string }>;
  };
};

const participationMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '056_eligible_participation_ledger.sql');
const objectivesMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '057_personal_objectives.sql');
const challengesMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '058_company_challenges_v2.sql');
const achievementsMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '059_private_achievements.sql');

function createExportDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      department_id TEXT,
      company_id TEXT,
      avatar_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      points INTEGER,
      level INTEGER,
      league TEXT
    );
    CREATE TABLE quiz_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      archetype_id TEXT,
      answers_json TEXT NOT NULL,
      created_at TEXT
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      message TEXT,
      read INTEGER,
      created_at TEXT
    );
    CREATE TABLE badges (id TEXT PRIMARY KEY, name TEXT, description TEXT);
    CREATE TABLE user_badges (
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      unlocked_at TEXT,
      PRIMARY KEY (user_id, badge_id)
    );
    CREATE TABLE health_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dimension TEXT,
      score REAL,
      recorded_at TEXT
    );
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE user_challenges (
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      progress INTEGER,
      status TEXT,
      started_at TEXT,
      completed_at TEXT,
      PRIMARY KEY (user_id, challenge_id)
    );
    CREATE TABLE activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT,
      target_type TEXT,
      target_id TEXT,
      points_earned INTEGER,
      created_at TEXT
    );
    CREATE TABLE mission_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mission_id TEXT,
      action TEXT,
      day TEXT,
      mood TEXT,
      glasses INTEGER,
      challenge_id TEXT,
      note TEXT,
      created_at TEXT
    );
    INSERT INTO companies (id) VALUES ('company-1'), ('company-2');
    INSERT INTO users (id, name, email, company_id) VALUES ('user-1', 'User', 'user@example.test', 'company-1');
  `);
  applyMigration(db, '056_eligible_participation_ledger.sql', fs.readFileSync(participationMigrationPath, 'utf8'));
  applyMigration(db, '057_personal_objectives.sql', fs.readFileSync(objectivesMigrationPath, 'utf8'));
  applyMigration(db, '058_company_challenges_v2.sql', fs.readFileSync(challengesMigrationPath, 'utf8'));
  applyMigration(db, '059_private_achievements.sql', fs.readFileSync(achievementsMigrationPath, 'utf8'));
  return db;
}

function stableId(index: number): string {
  return `item-${String(index).padStart(3, '0')}`;
}

function seedCollection(db: Database.Database, collection: StableCollection): string[] {
  const seed = db.transaction(() => {
    for (let index = 0; index < 90; index += 1) {
      const id = stableId(index);
      if (collection === 'quiz_results') {
        db.prepare(`
          INSERT INTO quiz_results (id, user_id, archetype_id, answers_json, created_at)
          VALUES (?, 'user-1', 'archetype-1', '{}', NULL)
        `).run(id);
      } else if (collection === 'user_badges') {
        db.prepare('INSERT INTO badges (id, name, description) VALUES (?, ?, ?)')
          .run(id, id, id);
        db.prepare(`
          INSERT INTO user_badges (user_id, badge_id, unlocked_at)
          VALUES ('user-1', ?, NULL)
        `).run(id);
      } else {
        db.prepare('INSERT INTO challenges (id, title) VALUES (?, ?)').run(id, id);
        db.prepare(`
          INSERT INTO user_challenges (user_id, challenge_id, progress, status)
          VALUES ('user-1', ?, 0, 'active')
        `).run(id);
      }
    }
  });
  seed();

  const key = collection === 'quiz_results'
    ? 'id'
    : collection === 'user_badges' ? 'badge_id' : 'challenge_id';
  db.prepare(`DELETE FROM ${collection} WHERE ${key} < ?`).run(stableId(10));
  return Array.from({ length: 80 }, (_, index) => stableId(index + 10));
}

function idsFromPayload(payload: DsarPayload, collection: StableCollection): string[] {
  if (collection === 'quiz_results') {
    return payload.quizResults.map(({ id }) => id);
  }
  if (collection === 'user_badges') {
    return payload.legacyDerivedData.badges.map(({ badge_id }) => badge_id);
  }
  return payload.legacyDerivedData.challenges.map(({ challenge_id }) => challenge_id);
}

function rebuildCollectionStorage(
  db: Database.Database,
  collection: StableCollection,
): void {
  const columns = collection === 'quiz_results'
    ? 'id, user_id, archetype_id, answers_json, created_at'
    : collection === 'user_badges'
      ? 'user_id, badge_id, unlocked_at'
      : 'user_id, challenge_id, progress, status, started_at, completed_at';
  const key = collection === 'quiz_results'
    ? 'id'
    : collection === 'user_badges' ? 'badge_id' : 'challenge_id';

  db.exec(`
    CREATE TEMP TABLE dsar_maintenance_copy AS
      SELECT ${columns} FROM ${collection} ORDER BY ${key};
    DELETE FROM ${collection};
    INSERT INTO ${collection} (${columns})
      SELECT ${columns} FROM dsar_maintenance_copy ORDER BY ${key};
    DROP TABLE dsar_maintenance_copy;
    VACUUM;
  `);
}

describe('stable DSAR pagination cursors', () => {
  it.each([
    ['quizResults', 'quiz_results'],
    ['badges', 'user_badges'],
    ['challenges', 'user_challenges'],
  ] as const)(
    'does not skip or duplicate %s when storage maintenance runs before its second page',
    (_label, collection) => {
      const db = createExportDatabase();
      try {
        const expectedIds = seedCollection(db, collection);
        let targetPageQueries = 0;
        let maintenanceRuns = 0;
        const targetPattern = new RegExp(`\\bFROM\\s+${collection}\\b`, 'i');
        const reader = {
          prepare(sql: string) {
            if (targetPattern.test(sql) && /\bLIMIT\s+\?/i.test(sql)) {
              targetPageQueries += 1;
              if (targetPageQueries === 2) {
                rebuildCollectionStorage(db, collection);
                maintenanceRuns += 1;
              }
            }
            return db.prepare(sql);
          },
        } as unknown as Database.Database;

        const json = Array.from(createDsarExportJsonChunks(
          reader,
          'user-1',
          '2026-07-16T00:00:00.000Z',
        )).join('');
        const payload = JSON.parse(json) as DsarPayload;
        const exportedIds = idsFromPayload(payload, collection);

        expect(maintenanceRuns).toBe(1);
        expect(targetPageQueries).toBe(2);
        expect(exportedIds).toEqual(expectedIds);
        expect(new Set(exportedIds).size).toBe(expectedIds.length);
        expect(json).not.toContain('__dsar_cursor_');
      } finally {
        db.close();
      }
    },
  );

  it('exports live and revoked eligible participation rows without cursor fields', () => {
    const db = createExportDatabase();
    try {
      const participation = createParticipationService(createParticipationRepository(db));
      participation.recordObjectiveStarted({
        actor: { userId: 'user-1', companyId: 'company-1' },
        sourceId: 'objective-1',
        mutationId: 'mutation-1',
        occurredAt: '2026-07-22T10:00:00.000Z',
      });
      const revoked = participation.recordChallengeCompleted({
        actor: { userId: 'user-1', companyId: 'company-1' },
        sourceId: 'challenge-1',
        mutationId: 'mutation-2',
        occurredAt: '2026-07-22T11:00:00.000Z',
      });
      participation.revokeParticipationEvent({
        eventId: revoked.id,
        companyId: 'company-1',
        actorId: 'admin-1',
        reasonCode: 'source_reversed',
        revokedAt: '2026-07-22T12:00:00.000Z',
      });

      const json = Array.from(createDsarExportJsonChunks(
        db,
        'user-1',
        '2026-07-22T13:00:00.000Z',
      )).join('');
      const payload = JSON.parse(json) as DsarPayload;

      expect(payload.eligibleParticipation.events.map((event) => event.source_id).sort())
        .toEqual(['challenge-1', 'objective-1']);
      expect(payload.eligibleParticipation.revocations).toMatchObject([
        { event_id: revoked.id, reason_code: 'source_reversed' },
      ]);
      expect(json).not.toContain('__dsar_cursor_');
    } finally {
      db.close();
    }
  });

  it('exports personal objectives alongside their eligible participation rows', () => {
    const db = createExportDatabase();
    try {
      const service = createPersonalObjectivesService(
        createObjectivesRepository(db),
        createParticipationRepository(db),
      );
      const objective = service.start({
        actor: { userId: 'user-1', companyId: 'company-1' },
        templateKey: 'weekly-learning',
        objectiveId: 'objective-1',
        now: '2026-07-22T10:00:00.000Z',
      });
      service.progress({
        actor: { userId: 'user-1', companyId: 'company-1' },
        objectiveId: objective.id,
        progress: 50,
        now: '2026-07-22T11:00:00.000Z',
      });

      const json = Array.from(createDsarExportJsonChunks(
        db,
        'user-1',
        '2026-07-22T13:00:00.000Z',
      )).join('');
      const payload = JSON.parse(json) as DsarPayload;

      expect(payload.personalObjectives).toMatchObject([
        {
          id: 'objective-1',
          template_key: 'weekly-learning',
          status: 'active',
          progress: 50,
        },
      ]);
      expect(payload.eligibleParticipation.events.map((event) => event.source_id))
        .toEqual(['objective-1', 'objective-1']);
      expect(json).not.toContain('__dsar_cursor_');
    } finally {
      db.close();
    }
  });

  it('exports company challenges alongside their eligible participation rows', () => {
    const db = createExportDatabase();
    try {
      const service = createCompanyChallengesService(
        createChallengesRepository(db),
        createParticipationRepository(db),
      );
      const challenge = service.join({
        actor: { userId: 'user-1', companyId: 'company-1' },
        catalogKey: 'learning-sprint',
        challengeId: 'challenge-v2-1',
        now: '2026-07-22T10:00:00.000Z',
      });
      service.progress({
        actor: { userId: 'user-1', companyId: 'company-1' },
        challengeId: challenge.id,
        progress: 50,
        now: '2026-07-22T11:00:00.000Z',
      });

      const json = Array.from(createDsarExportJsonChunks(
        db,
        'user-1',
        '2026-07-22T13:00:00.000Z',
      )).join('');
      const payload = JSON.parse(json) as DsarPayload;

      expect(payload.companyChallenges).toMatchObject([
        {
          id: 'challenge-v2-1',
          catalog_key: 'learning-sprint',
          status: 'joined',
          progress: 50,
        },
      ]);
      expect(payload.eligibleParticipation.events.map((event) => event.source_id))
        .toEqual(['challenge-v2-1', 'challenge-v2-1']);
      expect(json).not.toContain('__dsar_cursor_');
    } finally {
      db.close();
    }
  });

  it('exports private achievements alongside their eligible participation rows', () => {
    const db = createExportDatabase();
    try {
      createParticipationService(createParticipationRepository(db)).recordChallengeCompleted({
        actor: { userId: 'user-1', companyId: 'company-1' },
        sourceId: 'challenge-v2-1',
        mutationId: 'challenge-completed',
        occurredAt: '2026-07-22T10:00:00.000Z',
      });
      const achievements = createPrivateAchievementsService(
        createAchievementsRepository(db),
      ).sync(
        { userId: 'user-1', companyId: 'company-1' },
        '2026-07-22T11:00:00.000Z',
      );

      const json = Array.from(createDsarExportJsonChunks(
        db,
        'user-1',
        '2026-07-22T13:00:00.000Z',
      )).join('');
      const payload = JSON.parse(json) as DsarPayload;

      expect(achievements.some((achievement) => achievement.status === 'earned')).toBe(true);
      expect(payload.privateAchievements.some((achievement) => (
        achievement.achievement_key === 'first-challenge-completed'
        && achievement.status === 'earned'
        && achievement.progress === 100
      ))).toBe(true);
      expect(payload.eligibleParticipation.events.map((event) => event.source_id))
        .toEqual(['challenge-v2-1']);
      expect(json).not.toContain('__dsar_cursor_');
    } finally {
      db.close();
    }
  });
});
