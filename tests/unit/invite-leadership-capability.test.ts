import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  nanoCounter: 0,
}));

vi.mock('nanoid', () => ({
  nanoid: () => {
    boundary.nanoCounter += 1;
    return `generated-${boundary.nanoCounter}`;
  },
}));

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: (...args: any[]) => unknown) => handler,
}));
vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
}));
vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: async () => 'access-token',
  signRefreshToken: async () => 'refresh-token',
}));
vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: (response: Response) => response,
}));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('database not configured');
    return boundary.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!boundary.db) throw new Error('database not configured');
      return operation(boundary.db);
    },
  }),
}));

import { POST as acceptInvite } from '@/app/api/invites/[token]/route';

function setupDb() {
  const db = new Database(':memory:');
  boundary.db = db;
  boundary.nanoCounter = 0;
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT
    );
    CREATE TABLE invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      department_id TEXT,
      token TEXT NOT NULL,
      status TEXT NOT NULL,
      expires_at TEXT,
      accepted_at TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      company_id TEXT,
      department_id TEXT,
      league TEXT,
      approved INTEGER DEFAULT 0,
      also_collaborator INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE user_preferences (
      user_id TEXT,
      pref_key TEXT,
      pref_value TEXT,
      updated_at TEXT,
      UNIQUE(user_id, pref_key)
    );
    CREATE TABLE refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      token_hash TEXT,
      expires_at TEXT
    );
    CREATE TABLE employee_identity_profiles (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT,
      full_name TEXT NOT NULL,
      cpf_hash TEXT NOT NULL,
      cpf_last4 TEXT,
      email TEXT,
      deleted_at TEXT,
      updated_at TEXT
    );
    INSERT INTO companies (id, name) VALUES ('company-1', 'UniHER');
    INSERT INTO invites (id, company_id, email, role, token, status, expires_at)
      VALUES ('invite-1', 'company-1', 'lia@example.test', 'lideranca', 'leader-token', 'pending', datetime('now', '+1 day'));
    INSERT INTO employee_identity_profiles (id, company_id, user_id, full_name, cpf_hash, cpf_last4, email, deleted_at)
      VALUES ('profile-1', 'company-1', NULL, 'Lia Lider', 'cpf-secret-hash', '1234', 'lia@example.test', NULL);
  `);
  return db;
}

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('invite acceptance leadership capability', () => {
  beforeEach(() => {
    setupDb();
  });

  it('persists collaborator capability for newly invited leadership users', async () => {
    const response = await acceptInvite(
      new Request('http://localhost/api/invites/leader-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Lia Lider', password: 'Password1!' }),
      }),
      { params: Promise.resolve({ token: 'leader-token' }) },
    );

    expect(response.status).toBe(200);
    expect(
      boundary.db?.prepare(`
        SELECT email, role, also_collaborator
        FROM users
        WHERE email = 'lia@example.test'
      `).get(),
    ).toEqual({
      email: 'lia@example.test',
      role: 'lideranca',
      also_collaborator: 1,
    });
  });

  it('links an imported employee identity profile when the invited account is accepted', async () => {
    const response = await acceptInvite(
      new Request('http://localhost/api/invites/leader-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Lia Lider', password: 'Password1!' }),
      }),
      { params: Promise.resolve({ token: 'leader-token' }) },
    );

    expect(response.status).toBe(200);
    const linked = boundary.db?.prepare(`
      SELECT p.id, p.user_id
      FROM employee_identity_profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = 'profile-1'
        AND u.email = 'lia@example.test'
    `).get();

    expect(linked).toEqual({
      id: 'profile-1',
      user_id: 'generated-1',
    });
  });
});
