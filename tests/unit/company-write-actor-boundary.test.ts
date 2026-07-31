import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  auth: {
    userId: 'rh-1',
    companyId: 'company-a',
    role: 'rh',
  },
  db: null as Database.Database | null,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest) => handler(req, {
    params: Promise.resolve({}),
    auth: deps.auth,
  }),
}));

vi.mock('@/lib/db/init', () => ({
  initDb: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => operation(deps.db!),
  }),
}));

import { PATCH } from '@/app/api/company/route';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/company', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function companyName(id: string): string {
  return (deps.db!.prepare('SELECT name FROM companies WHERE id = ?').get(id) as { name: string }).name;
}

describe('company write actor boundary', () => {
  beforeEach(() => {
    deps.auth = {
      userId: 'rh-1',
      companyId: 'company-a',
      role: 'rh',
    };
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trade_name TEXT,
        cnpj TEXT NOT NULL,
        sector TEXT,
        plan TEXT NOT NULL DEFAULT 'trial',
        is_active INTEGER NOT NULL DEFAULT 1,
        logo_url TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        role TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 1,
        blocked INTEGER NOT NULL DEFAULT 0,
        is_master_admin INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE company_settings (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TEXT,
        UNIQUE(company_id, setting_key)
      );
      INSERT INTO companies (id, name, cnpj) VALUES
        ('company-a', 'Company A', '11111111111111'),
        ('company-b', 'Company B', '22222222222222');
      INSERT INTO users (id, company_id, role) VALUES ('rh-1', 'company-a', 'rh');
    `);
  });

  afterEach(() => {
    deps.db?.close();
    deps.db = null;
  });

  it('rejects the write when the RH actor is revoked after authentication', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run('rh-1');

    const response = await PATCH(request({ name: 'Changed' }), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(companyName('company-a')).toBe('Company A');
  });

  it('rejects a stale companyId instead of updating the actor current company', async () => {
    deps.db!.prepare('UPDATE users SET company_id = ? WHERE id = ?').run('company-b', 'rh-1');

    const response = await PATCH(request({ name: 'Changed' }), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(companyName('company-a')).toBe('Company A');
    expect(companyName('company-b')).toBe('Company B');
  });

  it('rolls back company fields when the related setting cannot be persisted', async () => {
    deps.db!.exec(`
      CREATE TRIGGER reject_company_setting
      BEFORE INSERT ON company_settings
      BEGIN
        SELECT RAISE(ABORT, 'setting rejected');
      END;
    `);

    await expect(PATCH(request({
      name: 'Changed',
      feedCompanyEnabled: false,
    }), { params: Promise.resolve({}) })).rejects.toThrow('setting rejected');

    expect(companyName('company-a')).toBe('Company A');
  });

  it('requires an admin actor to remain active in the same company', async () => {
    deps.auth = {
      userId: 'admin-1',
      companyId: 'company-a',
      role: 'admin',
    };
    deps.db!.prepare(`
      INSERT INTO users (id, company_id, role, is_master_admin)
      VALUES ('admin-1', 'company-a', 'admin', 0)
    `).run();
    deps.db!.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run('admin-1');

    const response = await PATCH(request({ name: 'Changed' }), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(companyName('company-a')).toBe('Company A');
  });

  it('rejects the write when the authenticated company is no longer active', async () => {
    deps.db!.prepare('UPDATE companies SET is_active = 0 WHERE id = ?').run('company-a');

    const response = await PATCH(request({ name: 'Changed' }), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(companyName('company-a')).toBe('Company A');
  });

  it('updates company fields and settings for an active RH actor', async () => {
    const response = await PATCH(request({
      name: 'Company A Updated',
      feedCompanyEnabled: false,
    }), { params: Promise.resolve({}) });
    const setting = deps.db!.prepare(`
      SELECT setting_value
      FROM company_settings
      WHERE company_id = ? AND setting_key = 'feed_company_enabled'
    `).get('company-a') as { setting_value: string };

    expect(response.status).toBe(200);
    expect(companyName('company-a')).toBe('Company A Updated');
    expect(setting.setting_value).toBe('0');
  });
});
