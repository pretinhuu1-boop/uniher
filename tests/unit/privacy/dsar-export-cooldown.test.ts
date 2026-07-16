import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import * as databaseModule from '@/lib/db';
import { applyMigration } from '@/lib/db/migrations/runner';
import { AppError, RateLimitError } from '@/lib/errors';

type DsarExportReservation = { token: string; nextAllowedAt: number };
type ReserveDsarExportWindow = (
  db: Database.Database,
  userId: string,
  now?: number,
) => DsarExportReservation;
type FinishDsarExportReservation = (
  db: Database.Database,
  userId: string,
  token: string,
  outcome: 'completed' | 'failed' | 'cancelled',
  now?: number,
) => boolean;
type OpenReadOnlyDb = (databasePath?: string) => Database.Database;

const databases: Database.Database[] = [];
const tempDirectories: string[] = [];
const migrationPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'db',
  'migrations',
  '051_dsar_export_cooldown.sql',
);
const resilienceMigrationPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'db',
  'migrations',
  '052_dsar_export_resilience.sql',
);

function openDatabase(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 0');
  databases.push(db);
  return db;
}

function closeDatabase(db: Database.Database): void {
  const index = databases.indexOf(db);
  if (index >= 0) databases.splice(index, 1);
  db.close();
}

function createDatabaseFile(): {
  db: Database.Database;
  filename: string;
  migrationSql: string;
  resilienceMigrationSql: string;
} {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-dsar-cooldown-'));
  tempDirectories.push(directory);
  const filename = path.join(directory, 'cooldown.sqlite');
  const db = openDatabase(filename);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, recorded_at TEXT NOT NULL);
    INSERT INTO users (id) VALUES ('user-1'), ('user-2');
  `);
  expect(fs.existsSync(migrationPath)).toBe(true);
  expect(fs.existsSync(resilienceMigrationPath)).toBe(true);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const resilienceMigrationSql = fs.readFileSync(resilienceMigrationPath, 'utf8');
  return { db, filename, migrationSql, resilienceMigrationSql };
}

async function loadDsarExportHelper(): Promise<{
  reserveDsarExportWindow?: ReserveDsarExportWindow;
  finishDsarExportReservation?: FinishDsarExportReservation;
}> {
  const modulePath = '@/lib/privacy/' + 'dsar-export';
  const helper = await import(modulePath).catch(() => ({}));
  return helper as {
    reserveDsarExportWindow?: ReserveDsarExportWindow;
    finishDsarExportReservation?: FinishDsarExportReservation;
  };
}

function applyDsarMigrations(
  db: Database.Database,
  migrationSql: string,
  resilienceMigrationSql: string,
): void {
  expect(applyMigration(db, '051_dsar_export_cooldown.sql', migrationSql)).toBe('applied');
  expect(applyMigration(db, '052_dsar_export_resilience.sql', resilienceMigrationSql)).toBe('applied');
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('persistent DSAR export cooldown', () => {
  it('applies migrations once with constrained tokenized cooldown state', () => {
    const { db, migrationSql, resilienceMigrationSql } = createDatabaseFile();

    expect(applyMigration(db, '051_dsar_export_cooldown.sql', migrationSql)).toBe('applied');
    expect(applyMigration(db, '051_dsar_export_cooldown.sql', migrationSql)).toBe('skipped');
    expect(applyMigration(db, '052_dsar_export_resilience.sql', resilienceMigrationSql)).toBe('applied');
    expect(applyMigration(db, '052_dsar_export_resilience.sql', resilienceMigrationSql)).toBe('skipped');

    const columns = db.prepare("PRAGMA table_info('dsar_export_cooldowns')").all() as Array<{
      name: string;
      notnull: number;
      pk: number;
    }>;
    expect(columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'user_id', pk: 1 }),
      expect.objectContaining({ name: 'next_allowed_at', notnull: 1 }),
      expect.objectContaining({ name: 'updated_at', notnull: 1 }),
      expect.objectContaining({ name: 'reservation_token' }),
      expect.objectContaining({ name: 'status', notnull: 1 }),
    ]));
    expect(() => db.prepare(`
      INSERT INTO dsar_export_cooldowns (user_id, next_allowed_at) VALUES ('user-1', -1)
    `).run()).toThrow();
  });

  it('reserves atomically across connections and persists the one-hour window', async () => {
    const { reserveDsarExportWindow, finishDsarExportReservation } = await loadDsarExportHelper();
    expect(reserveDsarExportWindow).toBeTypeOf('function');
    expect(finishDsarExportReservation).toBeTypeOf('function');
    if (!reserveDsarExportWindow || !finishDsarExportReservation) return;

    const { db: first, filename, migrationSql, resilienceMigrationSql } = createDatabaseFile();
    applyDsarMigrations(first, migrationSql, resilienceMigrationSql);
    const second = openDatabase(filename);
    const now = 1_800_000_000_000;

    const firstReservation = reserveDsarExportWindow(first, 'user-1', now);
    expect(firstReservation).toMatchObject({ token: expect.any(String), nextAllowedAt: now + 3_600_000 });
    expect(finishDsarExportReservation(second, 'user-1', 'stale-token', 'failed', now + 1)).toBe(false);
    expect(() => reserveDsarExportWindow(second, 'user-1', now + 1)).toThrow(RateLimitError);
    expect(reserveDsarExportWindow(second, 'user-2', now + 1)).toMatchObject({
      token: expect.any(String),
      nextAllowedAt: now + 3_600_001,
    });

    closeDatabase(first);
    closeDatabase(second);
    const reopened = openDatabase(filename);
    expect(() => reserveDsarExportWindow(reopened, 'user-1', now + 2)).toThrow(RateLimitError);
    const renewed = reserveDsarExportWindow(reopened, 'user-1', now + 3_600_000);
    expect(renewed).toMatchObject({ token: expect.any(String), nextAllowedAt: now + 7_200_000 });
    expect(renewed.token).not.toBe(firstReservation.token);
    expect(finishDsarExportReservation(reopened, 'user-1', firstReservation.token, 'failed', now + 3_600_001)).toBe(false);
    expect(reopened.prepare(`
      SELECT reservation_token, status FROM dsar_export_cooldowns WHERE user_id = 'user-1'
    `).get()).toEqual({ reservation_token: renewed.token, status: 'in_progress' });

    reopened.prepare("DELETE FROM users WHERE id = 'user-1'").run();
    expect(reopened.prepare("SELECT * FROM dsar_export_cooldowns WHERE user_id = 'user-1'").get()).toBeUndefined();
  });

  it('sanitizes SQLite contention as a non-retryable 503 error', async () => {
    const { reserveDsarExportWindow } = await loadDsarExportHelper();
    expect(reserveDsarExportWindow).toBeTypeOf('function');
    if (!reserveDsarExportWindow) return;

    const { db: lockHolder, filename, migrationSql, resilienceMigrationSql } = createDatabaseFile();
    applyDsarMigrations(lockHolder, migrationSql, resilienceMigrationSql);
    const contender = openDatabase(filename);
    lockHolder.exec('BEGIN IMMEDIATE');

    let thrown: unknown;
    try {
      reserveDsarExportWindow(contender, 'user-1', 1_800_000_000_000);
    } catch (error) {
      thrown = error;
    } finally {
      lockHolder.exec('ROLLBACK');
    }

    expect(thrown).toBeInstanceOf(AppError);
    expect(thrown).toMatchObject({ statusCode: 503, code: 'DATABASE_BUSY' });
    expect((thrown as Error).message).not.toMatch(/SQLITE_BUSY|SQLITE_LOCKED|database is locked/i);
  });

  it('indexes every unbounded DSAR ordering without a temporary B-tree', () => {
    const { db, migrationSql, resilienceMigrationSql } = createDatabaseFile();
    applyDsarMigrations(db, migrationSql, resilienceMigrationSql);

    const queries = [
      ['notifications', 'created_at', 'idx_dsar_notifications_user_created_at'],
      ['activity_log', 'created_at', 'idx_dsar_activity_log_user_created_at'],
      ['mission_logs', 'created_at', 'idx_dsar_mission_logs_user_created_at'],
      ['health_scores', 'recorded_at', 'idx_dsar_health_scores_user_recorded_at'],
    ] as const;
    for (const [table, orderedColumn, indexName] of queries) {
      const plan = db.prepare(`
        EXPLAIN QUERY PLAN SELECT id FROM ${table}
        WHERE user_id = ? ORDER BY ${orderedColumn} DESC
      `).all('user-1') as Array<{ detail: string }>;
      const details = plan.map(({ detail }) => detail).join('\n');
      expect(details, table).toContain(indexName);
      expect(details, table).not.toMatch(/USE TEMP B-TREE/i);
    }
  });

  it('opens isolated query-only readers that do not block a WAL writer', () => {
    const openReadOnlyDb = (databaseModule as typeof databaseModule & {
      openReadOnlyDb?: OpenReadOnlyDb;
    }).openReadOnlyDb;
    expect(openReadOnlyDb).toBeTypeOf('function');
    if (!openReadOnlyDb) return;

    const { db: writer, filename } = createDatabaseFile();
    writer.pragma('journal_mode = WAL');
    writer.exec(`
      CREATE TABLE wal_probe (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO wal_probe (value) VALUES ('one'), ('two'), ('three');
    `);
    expect(() => openReadOnlyDb(path.join(path.dirname(filename), 'missing.sqlite'))).toThrow();

    const reader = openReadOnlyDb(filename);
    const secondReader = openReadOnlyDb(filename);
    databases.push(reader, secondReader);
    expect(secondReader).not.toBe(reader);
    closeDatabase(secondReader);
    expect(reader.pragma('query_only', { simple: true })).toBe(1);
    expect(() => reader.prepare("INSERT INTO wal_probe (value) VALUES ('forbidden')").run()).toThrow();
    const iterator = reader.prepare('SELECT id, value FROM wal_probe ORDER BY id').iterate();
    try {
      expect(iterator.next()).toMatchObject({ done: false, value: { id: 1, value: 'one' } });
      expect(() => writer.prepare("INSERT INTO wal_probe (value) VALUES ('writer-passed')").run()).not.toThrow();
    } finally {
      iterator.return?.();
      closeDatabase(reader);
    }
  });
});
