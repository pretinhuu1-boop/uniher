import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
  auditEntries: [] as Array<Record<string, unknown>>,
  nanoCounter: 0,
}));

vi.mock('nanoid', () => ({
  nanoid: () => {
    runtime.nanoCounter += 1;
    return `generated-secret-${runtime.nanoCounter}`;
  },
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
}));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return {
    withRole: () => expose,
    withMasterAdmin: expose,
  };
});

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!runtime.db) throw new Error('test database not configured');
    return runtime.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!runtime.db) throw new Error('test database not configured');
      return operation(runtime.db);
    },
  }),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkAdminRateLimit: async () => undefined,
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(async (entry: Record<string, unknown>) => {
    runtime.auditEntries.push(entry);
  }),
}));

import { PATCH as patchAdminUser } from '@/app/api/admin/users/[id]/route';
import { PATCH as patchRhUser } from '@/app/api/rh/users/[id]/route';

type Handler = (request: Request, context: {
  auth: { userId: string; role: string; companyId?: string };
  params: Promise<{ id: string }>;
}) => Promise<Response>;

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      department_id TEXT,
      name TEXT,
      email TEXT,
      password_hash TEXT,
      role TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 0,
      updated_at TEXT,
      deleted_at TEXT
    );
    CREATE TABLE departments (id TEXT PRIMARY KEY, company_id TEXT, name TEXT);
    INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, approved, blocked, must_change_password)
    VALUES
      ('master-admin', NULL, NULL, 'Master', 'master@example.test', 'old-master', 'admin', 1, 0, 0),
      ('rh-a', 'company-a', 'dept-a', 'Rita RH', 'rh@example.test', 'old-rh', 'rh', 1, 0, 0),
      ('collab-a', 'company-a', 'dept-a', 'Ana A', 'ana@example.test', 'old-collab', 'colaboradora', 1, 0, 0);
  `);
  return db;
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/users/collab-a', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function targetPasswordState(): { password_hash: string; must_change_password: number } {
  return runtime.db!.prepare('SELECT password_hash, must_change_password FROM users WHERE id = ?')
    .get('collab-a') as { password_hash: string; must_change_password: number };
}

function expectNoSecretInPayload(payload: Record<string, unknown>) {
  expect(payload).not.toHaveProperty('temporaryPassword');
  expect(payload).not.toHaveProperty('tempPassword');
  expect(payload).not.toHaveProperty('password');
  expect(JSON.stringify(payload)).not.toMatch(/generated-secret|hashed:|temporaryPassword|tempPassword/i);
}

beforeEach(() => {
  runtime.db = createDatabase();
  runtime.auditEntries = [];
  runtime.nanoCounter = 0;
});

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

describe('password reset delivery boundary', () => {
  it('does not expose RH-generated temporary passwords in the API response', async () => {
    const response = await (patchRhUser as unknown as Handler)(
      request({ action: 'reset_password' }),
      {
        auth: { userId: 'rh-a', role: 'rh', companyId: 'company-a' },
        params: Promise.resolve({ id: 'collab-a' }),
      },
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expectNoSecretInPayload(payload);
    expect(payload).toMatchObject({
      success: true,
      passwordReset: {
        delivery: 'out_of_band_required',
        mustChangePassword: true,
      },
    });
    const state = targetPasswordState();
    expect(state.password_hash).toMatch(/^hashed:/);
    expect(state.password_hash).not.toBe('old-collab');
    expect(state.must_change_password).toBe(1);
  });

  it('does not expose Admin-generated temporary passwords and requires password change', async () => {
    const response = await (patchAdminUser as unknown as Handler)(
      request({ action: 'reset_password' }),
      {
        auth: { userId: 'master-admin', role: 'admin' },
        params: Promise.resolve({ id: 'collab-a' }),
      },
    );

    expect(response.status).toBe(200);
    const payload = await response.json() as Record<string, unknown>;
    expectNoSecretInPayload(payload);
    expect(payload).toMatchObject({
      success: true,
      passwordReset: {
        delivery: 'out_of_band_required',
        mustChangePassword: true,
      },
    });
    const state = targetPasswordState();
    expect(state.password_hash).toMatch(/^hashed:/);
    expect(state.password_hash).not.toBe('old-collab');
    expect(state.must_change_password).toBe(1);
  });

  it('does not claim email delivery in reset UI without a verified mail contract', () => {
    const rhManagement = readFileSync('src/app/(platform)/colaboradoras-gestao/page.tsx', 'utf8');

    expect(rhManagement).not.toMatch(/Enviad[ao] por email/i);
    expect(rhManagement).not.toMatch(/Nova senha:/i);
  });

  it('uses crypto-backed reset secret generation instead of Math.random', () => {
    const rhRoute = readFileSync('src/app/api/rh/users/[id]/route.ts', 'utf8');
    const adminRoute = readFileSync('src/app/api/admin/users/[id]/route.ts', 'utf8');

    expect(`${rhRoute}\n${adminRoute}`).not.toMatch(/Math\.random/);
    expect(rhRoute).toMatch(/nanoid/);
    expect(adminRoute).toMatch(/nanoid/);
  });
});
