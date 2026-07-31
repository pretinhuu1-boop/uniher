import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hasActiveRhActor } from '@/lib/security/active-rh-actor';

describe('active RH actor contract', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        role TEXT,
        approved INTEGER,
        blocked INTEGER,
        deleted_at TEXT
      );
      INSERT INTO companies (id, is_active)
      VALUES ('company-a', 1);
      INSERT INTO users (
        id, company_id, role, approved, blocked
      ) VALUES (
        'rh-1', 'company-a', 'rh', 1, 0
      );
    `);
  });

  afterEach(() => {
    db.close();
  });

  it('accepts only an explicitly active RH and company', () => {
    expect(hasActiveRhActor(db, 'rh-1', 'company-a')).toBe(true);
  });

  it.each([
    ['approved', 'UPDATE users SET approved = NULL WHERE id = ?'],
    ['blocked', 'UPDATE users SET blocked = NULL WHERE id = ?'],
    ['company active', 'UPDATE companies SET is_active = NULL WHERE id = ?'],
  ])('rejects a NULL %s state', (_field, sql) => {
    const id = sql.includes('companies') ? 'company-a' : 'rh-1';
    db.prepare(sql).run(id);

    expect(hasActiveRhActor(db, 'rh-1', 'company-a')).toBe(false);
  });
});
