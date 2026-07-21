import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContext } from '@/lib/auth/middleware';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => boundary.db,
}));

import { GET as getCollaboratorCompany } from '@/app/api/collaborator/company/route';

const context: AuthContext = {
  auth: {
    userId: 'collaborator-a',
    companyId: 'company-a',
    role: 'colaboradora',
  },
  params: Promise.resolve({}),
};

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT,
      cnpj TEXT,
      sector TEXT,
      plan TEXT,
      logo_url TEXT,
      contact_email TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      also_collaborator INTEGER NOT NULL DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );

    INSERT INTO companies (
      id, name, trade_name, cnpj, sector, plan, logo_url, contact_email
    ) VALUES (
      'company-a', 'Empresa Legal', 'Marca Legal', '00.000.000/0001-00',
      'Saude', 'enterprise', '/logos/company-a.png', 'rh@company-a.test'
    );
    INSERT INTO users (id, company_id, email, role)
    VALUES ('collaborator-a', 'company-a', 'ana@company-a.test', 'colaboradora');
  `);
  return db;
}

async function requestCompany(
  auth: AuthContext['auth'] = context.auth,
): Promise<Response> {
  return getCollaboratorCompany(
    new Request('http://localhost/api/collaborator/company') as never,
    { ...context, auth } as never,
  );
}

beforeEach(() => {
  boundary.db = createDatabase();
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('collaborator company identity API', () => {
  it('returns only the company identity fields required by the collaborator UI', async () => {
    const response = await requestCompany();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      company: {
        id: 'company-a',
        name: 'Empresa Legal',
        trade_name: 'Marca Legal',
        logo_url: '/logos/company-a.png',
      },
    });
  });

  it.each([
    ['blocked', "UPDATE users SET blocked = 1 WHERE id = 'collaborator-a'"],
    ['unapproved', "UPDATE users SET approved = 0 WHERE id = 'collaborator-a'"],
    ['deleted', "UPDATE users SET deleted_at = '2026-07-21T10:00:00.000Z' WHERE id = 'collaborator-a'"],
    ['capability revoked', "UPDATE users SET role = 'rh', also_collaborator = 0 WHERE id = 'collaborator-a'"],
  ])('fails closed when the persisted user is %s', async (_state, update) => {
    boundary.db?.exec(update);

    const response = await requestCompany();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ code: 'COLLABORATOR_CAPABILITY_REQUIRED' });
  });

  it('fails closed when the persisted company no longer matches the token tenant', async () => {
    boundary.db?.exec(`
      INSERT INTO companies (id, name) VALUES ('company-b', 'Empresa B');
      UPDATE users SET company_id = 'company-b' WHERE id = 'collaborator-a';
    `);

    const response = await requestCompany();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'COLLABORATOR_CAPABILITY_REQUIRED' });
  });

  it('fails closed when the persisted role no longer matches the authenticated role', async () => {
    boundary.db?.exec(`
      UPDATE users SET role = 'rh', also_collaborator = 1 WHERE id = 'collaborator-a';
    `);

    const response = await requestCompany();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'COLLABORATOR_CAPABILITY_REQUIRED' });
  });

  it.each([
    ['removed', "DELETE FROM companies WHERE id = 'company-a'"],
    ['inactive', "UPDATE companies SET is_active = 0 WHERE id = 'company-a'"],
    ['deleted', "UPDATE companies SET deleted_at = '2026-07-21T10:00:00.000Z' WHERE id = 'company-a'"],
  ])('returns a stable not-found response when the company is %s', async (_state, update) => {
    boundary.db?.exec(update);

    const response = await requestCompany();
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({ code: 'COMPANY_NOT_FOUND' });
  });

  it('accepts a current dual-role collaborator capability', async () => {
    boundary.db?.exec(`
      UPDATE users SET role = 'rh', also_collaborator = 1 WHERE id = 'collaborator-a';
    `);

    const response = await requestCompany({ ...context.auth, role: 'rh' });

    expect(response.status).toBe(200);
  });
});
