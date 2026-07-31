import Database from 'better-sqlite3';
import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '../../src/lib/db/migrations/runner';

let dbPath = '';
let db: Database.Database | null = null;

afterEach(() => {
  db?.close();
  db = null;
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (file) rmSync(file, { force: true });
  }
});

describe('migration runner atomicity', () => {
  it('rolls back schema SQL and receipt when migration execution fails', () => {
    dbPath = path.join(os.tmpdir(), `uniher-migration-atomic-${process.pid}-${Date.now()}.db`);
    db = new Database(dbPath);

    expect(() => applyMigration(
      db as Database.Database,
      '999_atomic_failure.sql',
      `
        CREATE TABLE atomic_probe (id INTEGER PRIMARY KEY);
        INSERT INTO missing_table (id) VALUES (1);
      `,
    )).toThrow();

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'atomic_probe'")
      .get();
    const receipt = db
      .prepare("SELECT name FROM _migrations WHERE name = '999_atomic_failure.sql'")
      .get();

    expect(table).toBeUndefined();
    expect(receipt).toBeUndefined();
  });
});
