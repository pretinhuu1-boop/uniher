import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { createAchievementsRepository } from '@/repositories/achievements.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createParticipationService } from '@/services/participation.service';
import { createPrivateAchievementsService } from '@/services/private-achievements.service';

const databases: Database.Database[] = [];
const participationMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '056_eligible_participation_ledger.sql');
const achievementsMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '059_private_achievements.sql');

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
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id, company_id, name) VALUES
      ('user-a', 'company-a', 'Ana'),
      ('user-b', 'company-b', 'Bruna'),
      ('admin-a', 'company-a', 'Admin');
  `);
  applyMigration(db, '056_eligible_participation_ledger.sql', fs.readFileSync(participationMigrationPath, 'utf8'));
  applyMigration(db, '059_private_achievements.sql', fs.readFileSync(achievementsMigrationPath, 'utf8'));
  return db;
}

function achievements(db: Database.Database) {
  return createPrivateAchievementsService(createAchievementsRepository(db));
}

function participation(db: Database.Database) {
  return createParticipationService(createParticipationRepository(db));
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('private achievements wave 8 contract', () => {
  it('syncs private achievements from non-revoked eligible events only', () => {
    const db = createDatabase();
    participation(db).recordObjectiveStarted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'objective-started',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    participation(db).recordChallengeJoined({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'challenge-a',
      mutationId: 'challenge-joined',
      occurredAt: '2026-07-22T11:00:00.000Z',
    });

    const rows = achievements(db).sync(
      { userId: 'user-a', companyId: 'company-a' },
      '2026-07-22T12:00:00.000Z',
    );
    const byKey = Object.fromEntries(rows.map((row) => [row.achievement_key, row]));

    expect(byKey['first-objective-started'].status).toBe('earned');
    expect(byKey['first-challenge-joined'].status).toBe('earned');
    expect(byKey['first-objective-completed'].status).toBe('in_progress');
    expect(byKey['first-challenge-completed'].status).toBe('in_progress');
    expect(db.prepare('SELECT COUNT(*) AS count FROM user_badges').get()).toEqual({ count: 0 });
  });

  it('keeps achievements company-scoped and revokes earned rows when the source event is revoked', () => {
    const db = createDatabase();
    const completed = participation(db).recordChallengeCompleted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'challenge-a',
      mutationId: 'challenge-completed',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    achievements(db).sync(
      { userId: 'user-a', companyId: 'company-a' },
      '2026-07-22T11:00:00.000Z',
    );
    participation(db).revokeParticipationEvent({
      eventId: completed.id,
      companyId: 'company-a',
      actorId: 'admin-a',
      reasonCode: 'source_reversed',
      revokedAt: '2026-07-22T12:00:00.000Z',
    });

    const companyA = achievements(db).sync(
      { userId: 'user-a', companyId: 'company-a' },
      '2026-07-22T13:00:00.000Z',
    );
    const companyB = achievements(db).sync(
      { userId: 'user-a', companyId: 'company-b' },
      '2026-07-22T13:00:00.000Z',
    );
    const completedAchievement = companyA.find((row) => row.achievement_key === 'first-challenge-completed');
    const repeatedSync = achievements(db).sync(
      { userId: 'user-a', companyId: 'company-a' },
      '2026-07-22T14:00:00.000Z',
    );
    const repeatedCompletedAchievement = repeatedSync.find((row) => row.achievement_key === 'first-challenge-completed');

    expect(completedAchievement?.status).toBe('revoked');
    expect(completedAchievement?.progress).toBe(0);
    expect(repeatedCompletedAchievement?.status).toBe('revoked');
    expect(repeatedCompletedAchievement?.progress).toBe(0);
    expect(companyB.every((row) => row.status === 'in_progress')).toBe(true);
  });

  it('hard-deletes private achievements during fulfilled user erasure', () => {
    const db = createDatabase();
    participation(db).recordObjectiveStarted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'objective-started',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    achievements(db).sync(
      { userId: 'user-a', companyId: 'company-a' },
      '2026-07-22T11:00:00.000Z',
    );

    const removeUser = db.transaction(() => {
      createAchievementsRepository(db).hardDeleteUserAchievementsInCurrentTransaction({
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

    expect(db.prepare('SELECT COUNT(*) AS count FROM private_achievements').get()).toEqual({ count: 0 });
    expect(createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
      includeRevoked: true,
    })).toEqual([]);
  });
});
