import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createDsarExportJsonChunks } from '@/lib/privacy/dsar-export';

type StableCollection = 'quiz_results' | 'user_badges' | 'user_challenges';

type DsarPayload = {
  quizResults: Array<{ id: string }>;
  legacyDerivedData: {
    badges: Array<{ badge_id: string }>;
    challenges: Array<{ challenge_id: string }>;
  };
};

function createExportDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
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
    INSERT INTO users (id, name, email) VALUES ('user-1', 'User', 'user@example.test');
  `);
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
});
