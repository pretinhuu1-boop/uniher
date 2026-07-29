import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

const databases: Database.Database[] = [];
const migrationName = '060_company_modules.sql';
const migrationPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'db',
  'migrations',
  migrationName,
);

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY);
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id) VALUES ('admin-a');
  `);
  return db;
}

function applyCompanyModulesMigration(db: Database.Database) {
  return applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('migration 060 company modules', () => {
  it('applies once and creates the company module schema without seeding access', () => {
    const db = createDatabase();

    expect(applyCompanyModulesMigration(db)).toBe('applied');
    expect(applyCompanyModulesMigration(db)).toBe('skipped');

    const columns = db.prepare(`PRAGMA table_info('company_modules')`).all() as Array<{ name: string }>;
    expect(columns.map(({ name }) => name)).toEqual([
      'id',
      'company_id',
      'module_slug',
      'module_state',
      'visible',
      'notes',
      'created_at',
      'updated_at',
      'updated_by',
    ]);
    expect(db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'index' AND name = 'idx_company_modules_company'
    `).get()).toEqual({ name: 'idx_company_modules_company' });
    expect(db.prepare('SELECT COUNT(*) AS count FROM company_modules').get()).toEqual({ count: 0 });
  });

  it('enforces approved slugs, approved states, visible flag and one row per company module', () => {
    const db = createDatabase();
    applyCompanyModulesMigration(db);

    db.prepare(`
      INSERT INTO company_modules (id, company_id, module_slug, module_state, visible)
      VALUES ('module-1', 'company-a', 'nr1', 'requires_contract', 1)
    `).run();

    expect(() => db.prepare(`
      INSERT INTO company_modules (id, company_id, module_slug, module_state)
      VALUES ('module-2', 'company-a', 'unknown', 'locked')
    `).run()).toThrow();
    expect(() => db.prepare(`
      INSERT INTO company_modules (id, company_id, module_slug, module_state)
      VALUES ('module-3', 'company-a', 'nr1', 'visible_locked')
    `).run()).toThrow();
    expect(() => db.prepare(`
      INSERT INTO company_modules (id, company_id, module_slug, module_state, visible)
      VALUES ('module-4', 'company-a', 'sipat', 'locked', 2)
    `).run()).toThrow();
    expect(() => db.prepare(`
      INSERT INTO company_modules (id, company_id, module_slug, module_state)
      VALUES ('module-5', 'company-a', 'nr1', 'locked')
    `).run()).toThrow();
  });

  it('cascades company deletion and nulls deleted updater references', () => {
    const db = createDatabase();
    applyCompanyModulesMigration(db);
    db.exec(`
      INSERT INTO company_modules (
        id, company_id, module_slug, module_state, updated_by
      ) VALUES (
        'module-1', 'company-a', 'sipat', 'locked', 'admin-a'
      );
      DELETE FROM users WHERE id = 'admin-a';
    `);

    expect(db.prepare(`
      SELECT updated_by FROM company_modules WHERE id = 'module-1'
    `).get()).toEqual({ updated_by: null });

    db.prepare("DELETE FROM companies WHERE id = 'company-a'").run();
    expect(db.prepare('SELECT COUNT(*) AS count FROM company_modules').get()).toEqual({ count: 0 });
  });
});
