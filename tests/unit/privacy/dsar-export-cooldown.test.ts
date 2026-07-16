import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { AppError, RateLimitError } from '@/lib/errors';

type ReserveDsarExportWindow = (
  db: Database.Database,
  userId: string,
  now?: number,
) => number;

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

function createDatabaseFile(): { db: Database.Database; filename: string; migrationSql: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-dsar-cooldown-'));
  tempDirectories.push(directory);
  const filename = path.join(directory, 'cooldown.sqlite');
  const db = openDatabase(filename);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY);
    INSERT INTO users (id) VALUES ('user-1'), ('user-2');
  `);
  expect(fs.existsSync(migrationPath)).toBe(true);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  return { db, filename, migrationSql };
}

async function loadReservation(): Promise<ReserveDsarExportWindow | undefined> {
  const modulePath = '@/lib/privacy/' + 'dsar-export';
  const helper = await import(modulePath).catch(() => ({}));
  return (helper as { reserveDsarExportWindow?: ReserveDsarExportWindow }).reserveDsarExportWindow;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('persistent DSAR export cooldown', () => {
  it('applies migration 051 once with the constrained cascade schema', () => {
    const { db, migrationSql } = createDatabaseFile();

    expect(applyMigration(db, '051_dsar_export_cooldown.sql', migrationSql)).toBe('applied');
    expect(applyMigration(db, '051_dsar_export_cooldown.sql', migrationSql)).toBe('skipped');

    const columns = db.prepare("PRAGMA table_info('dsar_export_cooldowns')").all() as Array<{
      name: string;
      notnull: number;
      pk: number;
    }>;
    expect(columns).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'user_id', pk: 1 }),
      expect.objectContaining({ name: 'next_allowed_at', notnull: 1 }),
      expect.objectContaining({ name: 'updated_at', notnull: 1 }),
    ]));
    expect(() => db.prepare(`
      INSERT INTO dsar_export_cooldowns (user_id, next_allowed_at) VALUES ('user-1', -1)
    `).run()).toThrow();
  });

  it('reserves atomically across connections and persists the one-hour window', async () => {
    const reserveDsarExportWindow = await loadReservation();
    expect(reserveDsarExportWindow).toBeTypeOf('function');
    if (!reserveDsarExportWindow) return;

    const { db: first, filename, migrationSql } = createDatabaseFile();
    expect(applyMigration(first, '051_dsar_export_cooldown.sql', migrationSql)).toBe('applied');
    const second = openDatabase(filename);
    const now = 1_800_000_000_000;

    expect(reserveDsarExportWindow(first, 'user-1', now)).toBe(now + 3_600_000);
    expect(() => reserveDsarExportWindow(second, 'user-1', now + 1)).toThrow(RateLimitError);
    expect(reserveDsarExportWindow(second, 'user-2', now + 1)).toBe(now + 3_600_001);

    closeDatabase(first);
    closeDatabase(second);
    const reopened = openDatabase(filename);
    expect(() => reserveDsarExportWindow(reopened, 'user-1', now + 2)).toThrow(RateLimitError);
    expect(reserveDsarExportWindow(reopened, 'user-1', now + 3_600_000)).toBe(now + 7_200_000);

    reopened.prepare("DELETE FROM users WHERE id = 'user-1'").run();
    expect(reopened.prepare("SELECT * FROM dsar_export_cooldowns WHERE user_id = 'user-1'").get()).toBeUndefined();
  });

  it('sanitizes SQLite contention as a non-retryable 503 error', async () => {
    const reserveDsarExportWindow = await loadReservation();
    expect(reserveDsarExportWindow).toBeTypeOf('function');
    if (!reserveDsarExportWindow) return;

    const { db: lockHolder, filename, migrationSql } = createDatabaseFile();
    expect(applyMigration(lockHolder, '051_dsar_export_cooldown.sql', migrationSql)).toBe('applied');
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
});
