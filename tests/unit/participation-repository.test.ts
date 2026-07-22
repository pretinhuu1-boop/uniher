import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { createParticipationEventKey } from '@/lib/participation/eligibility';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createParticipationService } from '@/services/participation.service';

const databases: Database.Database[] = [];
const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '056_eligible_participation_ledger.sql');

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
      deleted_at TEXT
    );
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id, company_id, name) VALUES
      ('user-a', 'company-a', 'Ana'),
      ('user-b', 'company-b', 'Bruna'),
      ('admin-a', 'company-a', 'Admin');
  `);
  applyMigration(db, '056_eligible_participation_ledger.sql', fs.readFileSync(migrationPath, 'utf8'));
  return db;
}

function service(db: Database.Database) {
  return createParticipationService(createParticipationRepository(db));
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('eligible participation repository', () => {
  it('stores one row for a retry and a second row for a new mutation', () => {
    const db = createDatabase();
    const participation = service(db);
    const input = {
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'mutation-1',
      occurredAt: '2026-07-22T10:00:00.000Z',
    };

    const first = participation.recordObjectiveProgressed(input);
    const retry = participation.recordObjectiveProgressed(input);
    const next = participation.recordObjectiveProgressed({ ...input, mutationId: 'mutation-2' });
    const rows = createParticipationRepository(db).listUserEvents({
      userId: 'user-a',
      companyId: 'company-a',
    });

    expect(retry.id).toBe(first.id);
    expect(next.id).not.toBe(first.id);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.metadata_json)).toEqual(['{}', '{}']);
  });

  it('never returns another company events in user reads', () => {
    const db = createDatabase();
    const repo = createParticipationRepository(db);
    service(db).recordChallengeJoined({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'challenge-a',
      mutationId: 'mutation-a',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    service(db).recordChallengeJoined({
      actor: { userId: 'user-b', companyId: 'company-b' },
      sourceId: 'company-b-sentinel',
      mutationId: 'mutation-b',
      occurredAt: '2026-07-22T10:01:00.000Z',
    });

    const companyA = repo.listUserEvents({ userId: 'user-a', companyId: 'company-a' });
    const crossCompany = repo.listUserEvents({ userId: 'user-b', companyId: 'company-a' });

    expect(companyA.map((row) => row.source_id)).toEqual(['challenge-a']);
    expect(JSON.stringify(companyA)).not.toContain('company-b-sentinel');
    expect(crossCompany).toEqual([]);
  });

  it('uses persisted source-domain checks and rejects metadata at the database boundary', () => {
    const db = createDatabase();
    const key = createParticipationEventKey({
      companyId: 'company-a',
      userId: 'user-a',
      eventType: 'objective_started',
      sourceDomain: 'personal_objective',
      sourceId: 'objective-a',
      mutationId: 'mutation-a',
    });

    expect(() => db.prepare(`
      INSERT INTO eligible_participation_events (
        id, event_key, mutation_id, company_id, user_id, event_type,
        source_domain, source_id, eligibility_version, metadata_json, occurred_at
      ) VALUES (
        'bad-source', @key, 'mutation-a', 'company-a', 'user-a', 'objective_started',
        'company_challenge', 'objective-a', 'participation-v1', '{}', '2026-07-22T10:00:00.000Z'
      )
    `).run({ key })).toThrow();

    expect(() => db.prepare(`
      INSERT INTO eligible_participation_events (
        id, event_key, mutation_id, company_id, user_id, event_type,
        source_domain, source_id, eligibility_version, metadata_json, occurred_at
      ) VALUES (
        'bad-metadata', @key, 'mutation-a', 'company-a', 'user-a', 'objective_started',
        'personal_objective', 'objective-a', 'participation-v1', '{"note":"free"}', '2026-07-22T10:00:00.000Z'
      )
    `).run({ key })).toThrow();
  });

  it('creates tombstones without editing the event row and excludes revoked events by default', () => {
    const db = createDatabase();
    const repo = createParticipationRepository(db);
    const event = service(db).recordChallengeCompleted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'challenge-a',
      mutationId: 'mutation-a',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    const before = db.prepare('SELECT * FROM eligible_participation_events WHERE id = ?').get(event.id);

    const revocation = service(db).revokeParticipationEvent({
      eventId: event.id,
      companyId: 'company-a',
      actorId: 'admin-a',
      reasonCode: 'source_reversed',
      revokedAt: '2026-07-22T11:00:00.000Z',
    });
    const after = db.prepare('SELECT * FROM eligible_participation_events WHERE id = ?').get(event.id);

    expect(after).toEqual(before);
    expect(revocation.reason_code).toBe('source_reversed');
    expect(repo.listUserEvents({ userId: 'user-a', companyId: 'company-a' })).toEqual([]);
    expect(repo.listUserEvents({ userId: 'user-a', companyId: 'company-a', includeRevoked: true })).toHaveLength(1);
    expect(repo.listRevocationsForUser({ userId: 'user-a', companyId: 'company-a' })).toHaveLength(1);
  });

  it('hard-deletes user events and tombstones while keeping only a count-only receipt', () => {
    const db = createDatabase();
    const participation = service(db);
    participation.recordObjectiveStarted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'mutation-a',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });
    const event = participation.recordChallengeLeft({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'challenge-a',
      mutationId: 'mutation-b',
      occurredAt: '2026-07-22T10:05:00.000Z',
    });
    participation.revokeParticipationEvent({
      eventId: event.id,
      companyId: 'company-a',
      actorId: 'admin-a',
      reasonCode: 'source_reversed',
      revokedAt: '2026-07-22T11:00:00.000Z',
    });

    const receipt = participation.hardDeleteUserParticipation({
      userId: 'user-a',
      companyId: 'company-a',
      actorId: 'admin-a',
      erasedAt: '2026-07-22T12:00:00.000Z',
    });
    const receiptJson = JSON.stringify(receipt);

    expect(receipt.event_count).toBe(2);
    expect(receiptJson).not.toContain('user-a');
    expect(receiptJson).not.toContain('objective-a');
    expect(receiptJson).not.toContain('challenge-a');
    expect(db.prepare('SELECT COUNT(*) AS count FROM eligible_participation_events').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM eligible_participation_event_revocations').get()).toEqual({ count: 0 });
    expect(createParticipationRepository(db).listErasureReceipts('company-a')).toHaveLength(1);
  });

  it('can hard-delete participation inside the fulfilled user deletion transaction', () => {
    const db = createDatabase();
    const repo = createParticipationRepository(db);
    service(db).recordObjectiveStarted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'mutation-a',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });

    const fulfilledDeletion = db.transaction(() => {
      repo.hardDeleteUserEventsInCurrentTransaction({
        userId: 'user-a',
        companyId: 'company-a',
        actorId: 'admin-a',
        erasedAt: '2026-07-22T12:00:00.000Z',
      });
      db.prepare("UPDATE users SET deleted_at = '2026-07-22T12:00:00.000Z' WHERE id = 'user-a'").run();
    });
    fulfilledDeletion.immediate();

    expect(repo.listUserEvents({ userId: 'user-a', companyId: 'company-a', includeRevoked: true })).toEqual([]);
    expect(repo.listErasureReceipts('company-a')).toHaveLength(1);
    expect(db.prepare('SELECT deleted_at FROM users WHERE id = ?').get('user-a'))
      .toEqual({ deleted_at: '2026-07-22T12:00:00.000Z' });
  });

  it('does not mutate legacy gamification tables when writing the ledger', () => {
    const db = createDatabase();
    db.exec(`
      CREATE TABLE users_legacy_probe (id TEXT PRIMARY KEY, points INTEGER, level INTEGER);
      CREATE TABLE user_badges (user_id TEXT, badge_id TEXT);
      CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, score INTEGER);
      INSERT INTO users_legacy_probe VALUES ('user-a', 10, 2);
      INSERT INTO user_badges VALUES ('user-a', 'legacy-badge');
      INSERT INTO health_scores VALUES ('health-a', 'user-a', 90);
    `);
    const before = JSON.stringify({
      users: db.prepare('SELECT * FROM users_legacy_probe').all(),
      badges: db.prepare('SELECT * FROM user_badges').all(),
      health: db.prepare('SELECT * FROM health_scores').all(),
    });

    service(db).recordObjectiveCompleted({
      actor: { userId: 'user-a', companyId: 'company-a' },
      sourceId: 'objective-a',
      mutationId: 'mutation-a',
      occurredAt: '2026-07-22T10:00:00.000Z',
    });

    const after = JSON.stringify({
      users: db.prepare('SELECT * FROM users_legacy_probe').all(),
      badges: db.prepare('SELECT * FROM user_badges').all(),
      health: db.prepare('SELECT * FROM health_scores').all(),
    });
    expect(after).toBe(before);
  });
});
