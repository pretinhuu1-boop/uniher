import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  hasActiveCompanyActor,
  hasActiveMasterAdminActor,
  hasActiveRhActor,
} from '@/lib/security/active-rh-actor';

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
        is_master_admin INTEGER,
        deleted_at TEXT
      );
      INSERT INTO companies (id, is_active)
      VALUES ('company-a', 1);
      INSERT INTO users (
        id, company_id, role, approved, blocked
      ) VALUES (
        'rh-1', 'company-a', 'rh', 1, 0
      );
      INSERT INTO users (
        id, role, approved, blocked, is_master_admin
      ) VALUES (
        'admin-1', 'admin', 1, 0, 1
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

  it('accepts only an explicitly active Master Admin', () => {
    expect(hasActiveMasterAdminActor(db, 'admin-1')).toBe(true);
  });

  it.each([
    ['master flag', 'UPDATE users SET is_master_admin = NULL WHERE id = ?'],
    ['approved', 'UPDATE users SET approved = NULL WHERE id = ?'],
    ['blocked', 'UPDATE users SET blocked = NULL WHERE id = ?'],
    ['role', "UPDATE users SET role = 'rh' WHERE id = ?"],
  ])('rejects an invalid Admin %s state', (_field, sql) => {
    db.prepare(sql).run('admin-1');

    expect(hasActiveMasterAdminActor(db, 'admin-1')).toBe(false);
  });

  it('binds a company actor to one allowed role or an allowed role list', () => {
    db.prepare('UPDATE users SET company_id = ? WHERE id = ?').run('company-a', 'admin-1');

    expect(hasActiveCompanyActor(db, 'admin-1', 'company-a', 'admin')).toBe(true);
    expect(hasActiveCompanyActor(db, 'admin-1', 'company-a', ['rh', 'admin'])).toBe(true);
    expect(hasActiveCompanyActor(db, 'admin-1', 'company-a', [])).toBe(false);
    expect(hasActiveCompanyActor(db, 'admin-1', 'company-b', 'admin')).toBe(false);

    db.prepare('UPDATE companies SET is_active = 0 WHERE id = ?').run('company-a');
    expect(hasActiveCompanyActor(db, 'admin-1', 'company-a', 'admin')).toBe(false);
  });
});
