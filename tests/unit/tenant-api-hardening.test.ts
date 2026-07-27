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
vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withAuth: expose, withRole: () => expose };
});
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
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
vi.mock('@/lib/security/rate-limit', () => ({
  checkAdminRateLimit: async () => undefined,
  checkReadRateLimit: async () => undefined,
  checkWriteRateLimit: async () => undefined,
}));
vi.mock('@/lib/gamification/containment', () => ({
  toSafeUserProjection: <T>(value: T) => value,
}));
vi.mock('@/lib/audit', () => ({ logAudit: async () => undefined }));
vi.mock('@/lib/mail', () => ({ sendEmailAsync: vi.fn() }));
vi.mock('@/lib/mail/templates', () => ({ inviteEmailHtml: () => '<p>invite</p>' }));
vi.mock('@/repositories/notification.repository', () => ({
  createNotification: async () => undefined,
}));

import { GET as getCompany } from '@/app/api/company/route';
import { GET as getInvites, POST as postInvite } from '@/app/api/invites/route';
import { GET as getPendingInvites } from '@/app/api/invites/pending/route';
import { GET as getLeaderTeam, POST as postLeaderTeam } from '@/app/api/leader/team/route';
import { GET as getRhUsers } from '@/app/api/rh/users/route';
import { PATCH as patchRhUser } from '@/app/api/rh/users/[id]/route';

function context(userId: string, role: string, companyId = 'company-a', params: Record<string, string> = {}) {
  return {
    auth: { userId, role, companyId },
    params: Promise.resolve(params),
  };
}

function request(url: string, body?: unknown) {
  return new Request(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createDatabase() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT,
      trade_name TEXT,
      cnpj TEXT,
      sector TEXT,
      plan TEXT,
      is_active INTEGER DEFAULT 1,
      logo_url TEXT,
      primary_color TEXT,
      secondary_color TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      created_at TEXT DEFAULT '2026-01-01',
      updated_at TEXT DEFAULT '2026-01-01',
      deleted_at TEXT
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
      email TEXT,
      password_hash TEXT,
      role TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      can_approve INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      created_at TEXT DEFAULT '2026-01-01',
      updated_at TEXT DEFAULT '2026-01-01',
      last_active TEXT,
      deleted_at TEXT
    );
    CREATE TABLE campaigns (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      status TEXT
    );
    CREATE TABLE company_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      setting_key TEXT,
      setting_value TEXT,
      updated_at TEXT,
      UNIQUE(company_id, setting_key)
    );
    CREATE TABLE invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      department_id TEXT,
      token TEXT NOT NULL,
      status TEXT NOT NULL,
      invited_by TEXT,
      expires_at TEXT,
      accepted_at TEXT,
      name TEXT,
      created_at TEXT DEFAULT '2026-01-01'
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT
    );

    INSERT INTO companies (id, name, cnpj, plan) VALUES
      ('company-a', 'Empresa A', '00', 'pro'),
      ('company-b', 'Empresa B', '11', 'pro');
    INSERT INTO departments (id, company_id, name) VALUES
      ('dept-a', 'company-a', 'Produto'),
      ('dept-a2', 'company-a', 'Operacoes'),
      ('dept-b', 'company-b', 'Produto B');
    INSERT INTO users (id, company_id, department_id, name, email, role, can_approve, approved) VALUES
      ('rh-a', 'company-a', 'dept-a', 'Rita RH', 'rh-a@example.test', 'rh', 0, 1),
      ('leader-a', 'company-a', 'dept-a', 'Lia Lider', 'leader-a@example.test', 'lideranca', 1, 1),
      ('collab-a', 'company-a', 'dept-a', 'Ana A', 'ana-a@example.test', 'colaboradora', 0, 0),
      ('collab-a2', 'company-a', 'dept-a2', 'Bia A2', 'bia-a2@example.test', 'colaboradora', 0, 0),
      ('collab-b', 'company-b', 'dept-a', 'Carla B', 'carla-b@example.test', 'colaboradora', 0, 0),
      ('collab-current', 'company-a', 'dept-a', 'Dora A', 'dora-a@example.test', 'colaboradora', 0, 1);
    INSERT INTO campaigns (id, company_id, status) VALUES ('campaign-a', 'company-a', 'active');
    INSERT INTO company_settings VALUES ('setting-a', 'company-a', 'feed_company_enabled', '1', '2026-01-01');
    INSERT INTO invites (id, company_id, email, role, department_id, token, status, invited_by) VALUES
      ('invite-a', 'company-a', 'nova-a@example.test', 'colaboradora', 'dept-a', 'token-a', 'pending', 'rh-a'),
      ('invite-a2', 'company-a', 'nova-a2@example.test', 'colaboradora', 'dept-a2', 'token-a2', 'pending', 'rh-a');
  `);
  return db;
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.nanoCounter = 0;
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('tenant and role hardening for direct APIs', () => {
  it('rejects collaborator and leadership reads of /api/company', async () => {
    const collaborator = await getCompany(request('http://localhost/api/company') as any, context('collab-current', 'colaboradora') as any);
    const leader = await getCompany(request('http://localhost/api/company') as any, context('leader-a', 'lideranca') as any);

    expect(collaborator.status).toBe(403);
    expect(leader.status).toBe(403);
  });

  it('rejects leader/team when the token tenant does not match the persisted leader', async () => {
    const response = await getLeaderTeam(
      request('http://localhost/api/leader/team') as any,
      context('leader-a', 'lideranca', 'company-b') as any,
    );

    expect(response.status).toBe(403);
  });

  it('does not let leadership approve a cross-tenant user with a matching department id', async () => {
    const response = await postLeaderTeam(
      request('http://localhost/api/leader/team', { action: 'approve', targetUserId: 'collab-b' }) as any,
      context('leader-a', 'lideranca') as any,
    );

    expect(response.status).toBe(404);
    expect(boundary.db!.prepare('SELECT approved FROM users WHERE id = ?').get('collab-b')).toEqual({ approved: 0 });
  });

  it('rejects RH assignment to a department from another company', async () => {
    const response = await patchRhUser(
      new Request('http://localhost/api/rh/users/collab-current', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', department_id: 'dept-b' }),
      }) as any,
      context('rh-a', 'rh', 'company-a', { id: 'collab-current' }) as any,
    );

    expect(response.status).toBe(404);
    expect(boundary.db!.prepare('SELECT department_id FROM users WHERE id = ?').get('collab-current'))
      .toEqual({ department_id: 'dept-a' });
  });

  it('rejects RH user listing when the token tenant does not match the persisted RH', async () => {
    const response = await getRhUsers(
      request('http://localhost/api/rh/users') as any,
      context('rh-a', 'rh', 'company-b') as any,
    );

    expect(response.status).toBe(403);
  });

  it('rejects invites with a department from another company', async () => {
    const response = await postInvite(
      request('http://localhost/api/invites', {
        email: 'new-user@example.test',
        role: 'colaboradora',
        department_id: 'dept-b',
      }) as any,
      context('rh-a', 'rh') as any,
    );

    expect(response.status).toBe(404);
    expect(boundary.db!.prepare('SELECT COUNT(*) AS count FROM invites WHERE email = ?').get('new-user@example.test'))
      .toEqual({ count: 0 });
  });

  it('keeps leadership invite and pending-user reads scoped to the leader department', async () => {
    const invitesResponse = await getInvites(
      request('http://localhost/api/invites') as any,
      context('leader-a', 'lideranca') as any,
    );
    const pendingResponse = await getPendingInvites(
      request('http://localhost/api/invites/pending') as any,
      context('leader-a', 'lideranca') as any,
    );

    expect(invitesResponse.status).toBe(200);
    expect((await invitesResponse.json()).invites.map((invite: { id: string }) => invite.id)).toEqual(['invite-a']);
    expect(pendingResponse.status).toBe(200);
    expect((await pendingResponse.json()).users.map((user: { id: string }) => user.id)).toEqual(['collab-a']);
  });
});
