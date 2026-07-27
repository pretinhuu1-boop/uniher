import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@/lib/auth/middleware';
import { COMPANY_MODULE_DEFINITIONS } from '@/types/modules';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  audit: [] as Record<string, unknown>[],
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
  withMasterAdmin: (handler: (...args: unknown[]) => unknown) => {
    return (req: unknown, context: { auth?: { role?: string; isMasterAdmin?: boolean } }) => {
      const legacyMasterAdmin = context.auth?.isMasterAdmin === undefined && context.auth?.role === 'admin';
      if (context.auth?.isMasterAdmin !== true && !legacyMasterAdmin) {
        return new Response(JSON.stringify({ error: 'Acesso restrito ao Admin Master' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      return handler(req, context);
    };
  },
}));
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('Test database is not configured');
    return boundary.db;
  },
  getWriteQueue: () => ({
    enqueue: async (callback: (db: Database.Database) => unknown) => {
      if (!boundary.db) throw new Error('Test database is not configured');
      return callback(boundary.db);
    },
  }),
}));
vi.mock('@/lib/audit', () => ({
  logAudit: async (entry: Record<string, unknown>) => {
    boundary.audit.push(entry);
  },
}));

import { GET as getCompanyModules, PATCH as updateCompanyModule } from '@/app/api/company/modules/route';

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT,
      trade_name TEXT
    );

    CREATE TABLE company_modules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      module_state TEXT NOT NULL,
      visible INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT,
      UNIQUE(company_id, module_slug)
    );

    INSERT INTO companies (id, name, trade_name) VALUES
      ('company-a', 'Empresa A', 'Empresa A'),
      ('company-b', 'Empresa B', 'Empresa B');

    INSERT INTO company_modules (
      id, company_id, module_slug, module_state, visible, notes, created_at, updated_at, updated_by
    ) VALUES
      ('company-a-education', 'company-a', 'education', 'enabled', 1, null, '2026-07-22T18:00:00.000Z', '2026-07-22T18:00:00.000Z', null),
      ('company-a-sipat', 'company-a', 'sipat', 'locked', 1, 'internal note', '2026-07-22T18:00:00.000Z', '2026-07-22T18:00:00.000Z', 'admin-a'),
      ('company-a-nr1', 'company-a', 'nr1', 'requires_contract', 0, null, '2026-07-22T18:00:00.000Z', '2026-07-22T18:00:00.000Z', null),
      ('company-b-education', 'company-b', 'education', 'enabled', 1, null, '2026-07-22T18:00:00.000Z', '2026-07-22T18:00:00.000Z', null),
      ('company-b-concierge', 'company-b', 'concierge', 'enabled', 1, null, '2026-07-22T18:00:00.000Z', '2026-07-22T18:00:00.000Z', null);
  `);
  return db;
}

function context(
  companyId: string,
  role: AuthContext['auth']['role'] = 'rh',
  isMasterAdmin = false,
): AuthContext {
  return {
    auth: { userId: 'user-a', companyId, role, isMasterAdmin },
    params: Promise.resolve({}),
  };
}

async function getModules(companyId: string): Promise<Response> {
  return getCompanyModules(
    new Request('http://localhost/api/company/modules') as unknown as NextRequest,
    context(companyId),
  );
}

async function patchModule(
  body: Record<string, unknown>,
  authContext = context('', 'admin', true),
): Promise<Response> {
  return updateCompanyModule(
    new Request('http://localhost/api/company/modules', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(body),
    }) as unknown as NextRequest,
    authContext,
  );
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.audit = [];
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('company modules API', () => {
  it('returns navigation defaults overlaid with rows scoped to the authenticated company', async () => {
    const response = await getModules('company-a');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      modules: [
        { module_slug: 'primary_health', module_state: 'locked', visible: 1 },
        { module_slug: 'concierge', module_state: 'requires_contract', visible: 1 },
        { module_slug: 'education', module_state: 'enabled', visible: 1 },
        { module_slug: 'achievements', module_state: 'enabled', visible: 1 },
        { module_slug: 'nr1', module_state: 'requires_contract', visible: 0 },
        { module_slug: 'sipat', module_state: 'locked', visible: 1 },
        { module_slug: 'human_development', module_state: 'requires_contract', visible: 1 },
        { module_slug: 'denunciation', module_state: 'partner_managed', visible: 1 },
      ],
    });
  });

  it('returns visible locked defaults for companies without module records without creating database rows', async () => {
    const response = await getModules('company-c');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      modules: COMPANY_MODULE_DEFINITIONS.map((definition) => ({
        module_slug: definition.slug,
        module_state: definition.defaultState,
        visible: definition.visibleByDefault ? 1 : 0,
      })),
    });
    expect(boundary.db?.prepare(
      'SELECT COUNT(*) AS count FROM company_modules WHERE company_id = ?',
    ).get('company-c')).toEqual({ count: 0 });
  });

  it('rejects requests without an authenticated company scope', async () => {
    const response = await getModules('');

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: 'Empresa nao encontrada' });
  });

  it('lets only Master Admin mutate one company module state and audits old/new values', async () => {
    const response = await patchModule({
      company_id: 'company-a',
      module_slug: 'education',
      module_state: 'locked',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      module: {
        company_id: 'company-a',
        module_slug: 'education',
        module_state: 'locked',
        visible: 1,
        updated_by: 'user-a',
      },
    });
    expect(boundary.db?.prepare(
      'SELECT module_state FROM company_modules WHERE company_id = ? AND module_slug = ?',
    ).get('company-b', 'education')).toEqual({ module_state: 'enabled' });
    expect(boundary.audit).toHaveLength(1);
    expect(boundary.audit[0]).toMatchObject({
      action: 'company_module_update',
      entityType: 'company_module',
      entityId: 'company-a:education',
      details: {
        company_id: 'company-a',
        module_slug: 'education',
        old: { module_state: 'enabled', visible: 1 },
        new: { module_state: 'locked', visible: 1 },
      },
      ip: '127.0.0.1',
    });
  });

  it('keeps RH read-only for company module mutation attempts', async () => {
    const response = await patchModule({
      company_id: 'company-a',
      module_slug: 'education',
      module_state: 'locked',
    }, context('company-a', 'rh', false));

    expect(response.status).toBe(403);
    expect(boundary.db?.prepare(
      'SELECT module_state FROM company_modules WHERE company_id = ? AND module_slug = ?',
    ).get('company-a', 'education')).toEqual({ module_state: 'enabled' });
    expect(boundary.audit).toEqual([]);
  });

  it('rejects enabling sensitive modules without changing rows or logging audit', async () => {
    const response = await patchModule({
      company_id: 'company-a',
      module_slug: 'nr1',
      module_state: 'enabled',
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Modulo sensivel depende de contrato ou fonte aprovada para ser habilitado',
    });
    expect(boundary.db?.prepare(
      'SELECT module_state FROM company_modules WHERE company_id = ? AND module_slug = ?',
    ).get('company-a', 'nr1')).toEqual({ module_state: 'requires_contract' });
    expect(boundary.audit).toEqual([]);
  });
});
