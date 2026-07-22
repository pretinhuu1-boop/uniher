import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { listCompanyChallengeCatalog } from '@/lib/challenges/catalog';
import { createChallengesRepository } from '@/repositories/challenges.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createCompanyChallengesService } from '@/services/company-challenges.service';

const databases: Database.Database[] = [];
const participationMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '056_eligible_participation_ledger.sql');
const challengesMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '058_company_challenges_v2.sql');

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
    CREATE TABLE user_badges (user_id TEXT NOT NULL, badge_id TEXT NOT NULL);
    CREATE TABLE user_leagues (id TEXT PRIMARY KEY, user_id TEXT NOT NULL);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT, points_earned INTEGER);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, dimension TEXT, score REAL);
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id, company_id, name) VALUES
      ('user-a', 'company-a', 'Ana'),
      ('user-b', 'company-b', 'Bruna'),
      ('admin-a', 'company-a', 'Admin');
  `);
  applyMigration(db, '056_eligible_participation_ledger.sql', fs.readFileSync(participationMigrationPath, 'utf8'));
  applyMigration(db, '058_company_challenges_v2.sql', fs.readFileSync(challengesMigrationPath, 'utf8'));
  return db;
}

function service(db: Database.Database) {
  return createCompanyChallengesService(
    createChallengesRepository(db),
    createParticipationRepository(db),
  );
}

function legacyCounts(db: Database.Database): Record<string, number> {
  return {
    userBadges: (db.prepare('SELECT COUNT(*) AS count FROM user_badges').get() as { count: number }).count,
    userLeagues: (db.prepare('SELECT COUNT(*) AS count FROM user_leagues').get() as { count: number }).count,
    activityLog: (db.prepare('SELECT COUNT(*) AS count FROM activity_log').get() as { count: number }).count,
    healthScores: (db.prepare('SELECT COUNT(*) AS count FROM health_scores').get() as { count: number }).count,
  };
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('company challenges wave 7 contract', () => {
  it('joins approved catalog challenges and writes eligible participation events only', () => {
    const db = createDatabase();
    const challenges = service(db);
    const challenge = challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'learning-sprint',
      challengeId: 'challenge-a',
      now: '2026-07-22T10:00:00.000Z',
    });

    const events = createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
    });

    expect(challenge.challenge.title).toBe(listCompanyChallengeCatalog()[0].title);
    expect(challenge.status).toBe('joined');
    expect(events).toMatchObject([
      {
        event_type: 'challenge_joined',
        source_domain: 'company_challenge',
        source_id: 'challenge-a',
        metadata_json: '{}',
      },
    ]);
    expect(legacyCounts(db)).toEqual({
      userBadges: 0,
      userLeagues: 0,
      activityLog: 0,
      healthScores: 0,
    });
  });

  it('records progress, completion and leave without cross-company exposure', () => {
    const db = createDatabase();
    const challenges = service(db);
    challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'focus-sessions',
      challengeId: 'challenge-a',
      now: '2026-07-22T10:00:00.000Z',
    });
    challenges.progress({
      actor: { userId: 'user-a', companyId: 'company-a' },
      challengeId: 'challenge-a',
      progress: 50,
      now: '2026-07-22T11:00:00.000Z',
    });
    const completed = challenges.complete({
      actor: { userId: 'user-a', companyId: 'company-a' },
      challengeId: 'challenge-a',
      now: '2026-07-22T12:00:00.000Z',
    });
    challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'weekly-routine',
      challengeId: 'challenge-b',
      now: '2026-07-22T13:00:00.000Z',
    });
    const left = challenges.leave({
      actor: { userId: 'user-a', companyId: 'company-a' },
      challengeId: 'challenge-b',
      now: '2026-07-22T14:00:00.000Z',
    });

    const companyA = challenges.list({ userId: 'user-a', companyId: 'company-a' });
    const crossCompany = challenges.list({ userId: 'user-a', companyId: 'company-b' });
    const eventTypes = createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
    }).map((event) => event.event_type);

    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(left.status).toBe('left');
    expect(companyA.challenges).toHaveLength(2);
    expect(crossCompany.challenges).toEqual([]);
    expect(eventTypes.sort()).toEqual([
      'challenge_completed',
      'challenge_joined',
      'challenge_joined',
      'challenge_left',
      'challenge_progressed',
    ]);
  });

  it('fails closed for duplicate joins, unavailable catalog and progress rollback', () => {
    const db = createDatabase();
    const challenges = service(db);
    challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'learning-sprint',
      challengeId: 'challenge-a',
      now: '2026-07-22T10:00:00.000Z',
    });
    challenges.progress({
      actor: { userId: 'user-a', companyId: 'company-a' },
      challengeId: 'challenge-a',
      progress: 50,
      now: '2026-07-22T11:00:00.000Z',
    });

    expect(() => challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'learning-sprint',
      challengeId: 'challenge-duplicate',
      now: '2026-07-22T12:00:00.000Z',
    })).toThrow(/UNIQUE constraint failed/);
    expect(() => challenges.join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'not-approved',
      challengeId: 'challenge-missing',
      now: '2026-07-22T12:00:00.000Z',
    })).toThrow(/not approved/);
    expect(() => challenges.progress({
      actor: { userId: 'user-a', companyId: 'company-a' },
      challengeId: 'challenge-a',
      progress: 25,
      now: '2026-07-22T12:00:00.000Z',
    })).toThrow(/monotonic/);
  });

  it('hard-deletes company challenges during fulfilled user erasure', () => {
    const db = createDatabase();
    service(db).join({
      actor: { userId: 'user-a', companyId: 'company-a' },
      catalogKey: 'learning-sprint',
      challengeId: 'challenge-a',
      now: '2026-07-22T10:00:00.000Z',
    });

    const removeUser = db.transaction(() => {
      createChallengesRepository(db).hardDeleteUserChallengesInCurrentTransaction({
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

    expect(db.prepare('SELECT COUNT(*) AS count FROM user_company_challenges').get()).toEqual({ count: 0 });
    expect(createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
      includeRevoked: true,
    })).toEqual([]);
  });
});
