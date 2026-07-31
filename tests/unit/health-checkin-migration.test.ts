import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in migration numbering', () => {
  it('uses a migration number that does not collide with the current main migration range', () => {
    const migrationsDir = path.join(process.cwd(), 'src/lib/db/migrations');

    expect(existsSync(path.join(migrationsDir, '048_user_exams_source.sql'))).toBe(false);
    expect(existsSync(path.join(migrationsDir, '067_user_exams_source.sql'))).toBe(true);
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
