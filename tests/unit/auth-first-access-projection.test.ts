import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
}));

vi.mock('@/lib/db/init', () => ({
  initDb: async () => undefined,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkAuthRateLimit: async () => undefined,
  recordFailedAuth: async () => undefined,
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `hashed:${password}`,
}));

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: async () => 'access-token',
  signRefreshToken: async () => 'refresh-token',
}));

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: (response: Response) => response,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: any[]) => unknown) => handler,
}));

vi.mock('@/lib/audit', () => ({
  logAudit: async () => undefined,
}));

vi.mock('@/repositories/refresh-token.repository', () => ({
  createRefreshToken: async () => undefined,
  deleteAllUserTokens: async () => undefined,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('test database not configured');
    return boundary.db;
  },
}));

import { POST as login } from '@/app/api/auth/login/route';
import { GET as getAuthMe } from '@/app/api/auth/me/route';

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT,
      trade_name TEXT,
      cnpj TEXT,
      sector TEXT,
      plan TEXT,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      department_id TEXT,
      name TEXT,
      nickname TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      is_master_admin INTEGER DEFAULT 0,
      avatar_url TEXT,
      level INTEGER DEFAULT 9,
      points INTEGER DEFAULT 99,
      streak INTEGER DEFAULT 7,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 0,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      last_active TEXT,
      also_collaborator INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '2026-01-01',
      updated_at TEXT DEFAULT '2026-01-01',
      deleted_at TEXT
    );
    CREATE TABLE user_preferences (
      user_id TEXT,
      pref_key TEXT,
      pref_value TEXT,
      updated_at TEXT,
      UNIQUE(user_id, pref_key)
    );

    INSERT INTO companies (id, name, trade_name, cnpj, sector, plan, is_active)
    VALUES ('company-a', 'Empresa A', 'Empresa A', '00.000.000/0001-00', 'Saude', 'pro', 1);
    INSERT INTO departments (id, company_id, name)
    VALUES ('dept-a', 'company-a', 'Produto');
    INSERT INTO users (
      id, company_id, department_id, name, nickname, email, password_hash, role, must_change_password
    ) VALUES
      ('must-change', 'company-a', 'dept-a', 'Senha', 'Senha', 'must@example.test', 'hashed:Password1!', 'rh', 1),
      ('tour-pending', 'company-a', 'dept-a', 'Tour', 'Tour', 'tour@example.test', 'hashed:Password1!', 'rh', 0),
      ('ready-user', 'company-a', 'dept-a', 'Pronta', 'Pronta', 'ready@example.test', 'hashed:Password1!', 'colaboradora', 0);
    INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
    VALUES ('tour-pending', 'first_access_tour_completed', '0', '2026-01-01');
  `);
  return db;
}

function loginRequest(email: string): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password1!' }),
  });
}

async function loginUser(email: string) {
  const response = await login(loginRequest(email));
  expect(response.status).toBe(200);
  return (await response.json()).user as Record<string, unknown>;
}

async function authMe(userId: string, mustChangePassword: boolean) {
  const response = await getAuthMe(new Request('http://localhost/api/auth/me') as never, {
    auth: {
      userId,
      role: userId === 'ready-user' ? 'colaboradora' : 'rh',
      companyId: 'company-a',
      mustChangePassword,
    },
  } as never);
  expect(response.status).toBe(200);
  return (await response.json()).user as Record<string, unknown>;
}

function expectFirstAccessState(
  user: Record<string, unknown>,
  expected: { mustChangePassword: boolean; firstAccessTourCompleted: boolean },
) {
  expect(user).toMatchObject(expected);
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('points');
  expect(user).not.toHaveProperty('level');
  expect(user).not.toHaveProperty('streak');
}

describe('auth first-access projection parity', () => {
  beforeEach(() => {
    boundary.db = createDatabase();
  });

  afterEach(() => {
    boundary.db?.close();
    boundary.db = null;
  });

  it('keeps must-change-password users on the first-access password step', async () => {
    expectFirstAccessState(await loginUser('must@example.test'), {
      mustChangePassword: true,
      firstAccessTourCompleted: false,
    });
    expectFirstAccessState(await authMe('must-change', true), {
      mustChangePassword: true,
      firstAccessTourCompleted: false,
    });
  });

  it('keeps users with pending first-access tour on primeiro-acesso after login', async () => {
    expectFirstAccessState(await loginUser('tour@example.test'), {
      mustChangePassword: false,
      firstAccessTourCompleted: false,
    });
    expectFirstAccessState(await authMe('tour-pending', false), {
      mustChangePassword: false,
      firstAccessTourCompleted: false,
    });
  });

  it('treats users without an explicit tour preference as complete after password is not required', async () => {
    expectFirstAccessState(await loginUser('ready@example.test'), {
      mustChangePassword: false,
      firstAccessTourCompleted: true,
    });
    expectFirstAccessState(await authMe('ready-user', false), {
      mustChangePassword: false,
      firstAccessTourCompleted: true,
    });
  });
});
