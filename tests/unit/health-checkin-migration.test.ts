import { existsSync, readFileSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in migration numbering', () => {
  it('uses a migration number that does not collide with the current main migration range', () => {
    const migrationsDir = path.join(process.cwd(), 'src/lib/db/migrations');

    expect(existsSync(path.join(migrationsDir, '048_user_exams_source.sql'))).toBe(false);
    expect(existsSync(path.join(migrationsDir, '067_user_exams_source.sql'))).toBe(true);
    expect(existsSync(path.join(migrationsDir, '068_semaforo_exam_dates_and_concierge_cases.sql'))).toBe(true);
  });

  it('adds stable exam keys and an idempotent private Concierge case store', async () => {
    const dbPath = path.join(os.tmpdir(), `uniher-health-checkin-contract-${process.pid}-${Date.now()}.db`);
    process.env.DATABASE_PATH = dbPath;

    const db = await import('../../src/lib/db');
    const runner = await import('../../src/lib/db/migrations/runner');

    try {
      await runner.runMigrations();

      const readDb = db.getReadDb();
      const examKeyColumn = readDb
        .prepare("SELECT name FROM pragma_table_info('user_exams') WHERE name = 'exam_key'")
        .get();
      const conciergeTable = readDb
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'concierge_cases'")
        .get();
      const openCaseIndex = readDb
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_concierge_cases_one_open'")
        .get() as { sql?: string } | undefined;

      expect(examKeyColumn).toBeTruthy();
      expect(conciergeTable).toBeTruthy();
      expect(openCaseIndex?.sql).toContain("WHERE status IN ('open', 'in_progress')");
    } finally {
      db.closeDb();
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        rmSync(file, { force: true });
      }
    }
  });

  it('backfills stable keys for exam quiz rows created before migration 068', async () => {
    const dbPath = path.join(os.tmpdir(), `uniher-health-checkin-backfill-${process.pid}-${Date.now()}.db`);
    const database = new Database(dbPath);
    const migrationPath = path.join(
      process.cwd(),
      'src/lib/db/migrations/068_semaforo_exam_dates_and_concierge_cases.sql'
    );
    const { applyMigration } = await import('../../src/lib/db/migrations/runner');

    try {
      database.exec(`
        CREATE TABLE user_exams (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          exam_name TEXT NOT NULL,
          due_date TEXT,
          completed_date TEXT,
          status TEXT,
          source TEXT,
          created_at TEXT
        );
      `);
      database.prepare(`
        INSERT INTO user_exams (id, user_id, exam_name, status, source)
        VALUES (?, ?, ?, ?, ?)
      `).run('legacy-1', 'user-1', 'Mamografia', 'overdue', 'semaforo_exam_quiz');

      expect(applyMigration(
        database,
        '068_semaforo_exam_dates_and_concierge_cases.sql',
        readFileSync(migrationPath, 'utf8')
      )).toBe('applied');

      const row = database.prepare(`
        SELECT exam_key, unknown_due_date, status
        FROM user_exams
        WHERE id = 'legacy-1'
      `).get() as { exam_key?: string; unknown_due_date?: number; status?: string };

      expect(row).toEqual({
        exam_key: 'mammography',
        unknown_due_date: 1,
        status: 'overdue',
      });
    } finally {
      database.close();
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        rmSync(file, { force: true });
      }
    }
  });

  it('does not rerun the renamed migration on databases that applied the old filename', async () => {
    const dbPath = path.join(os.tmpdir(), `uniher-health-checkin-migration-${process.pid}-${Date.now()}.db`);
    process.env.DATABASE_PATH = dbPath;

    const db = await import('../../src/lib/db');
    const runner = await import('../../src/lib/db/migrations/runner');

    try {
      await runner.runMigrations();

      const writeQueue = db.getWriteQueue();
      await writeQueue.enqueue((database) => {
        database
          .prepare("UPDATE _migrations SET name = '048_user_exams_source.sql' WHERE name = '067_user_exams_source.sql'")
          .run();
      });

      await expect(runner.runMigrations()).resolves.toBeUndefined();

      const readDb = db.getReadDb();
      const sourceColumn = readDb
        .prepare("SELECT name FROM pragma_table_info('user_exams') WHERE name = 'source'")
        .get();
      const canonicalMigration = readDb
        .prepare("SELECT name FROM _migrations WHERE name = '067_user_exams_source.sql'")
        .get();

      expect(sourceColumn).toBeTruthy();
      expect(canonicalMigration).toBeTruthy();
    } finally {
      db.closeDb();
      for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
        rmSync(file, { force: true });
      }
    }
  });
});
