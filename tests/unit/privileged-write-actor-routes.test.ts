import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  db: null as Database.Database | null,
  logAudit: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withMasterAdmin: (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: {
      userId: 'admin-1',
      companyId: '',
      role: 'admin',
      isMasterAdmin: true,
    },
  }),
  withRole: (...roles: string[]) => (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => {
    const isLeader = roles.length === 1 && roles[0] === 'lideranca';
    return handler(req, {
      params: segment.params ?? Promise.resolve({}),
      auth: isLeader
        ? {
            userId: 'leader-1',
            companyId: 'company-a',
            role: 'lideranca',
          }
        : {
            userId: 'rh-1',
            companyId: 'company-a',
            role: 'rh',
            isMasterAdmin: false,
          },
    });
  },
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!deps.db) throw new Error('Test database not initialized');
      return operation(deps.db);
    },
  }),
}));

vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: deps.logAudit }));
vi.mock('@/repositories/notification.repository', () => ({
  createNotification: deps.createNotification,
}));
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(async () => 'hashed-password'),
  verifyPassword: vi.fn(async () => true),
}));

import { POST as createAdminUser } from '@/app/api/admin/users/route';
import {
  PATCH as updateAdminUser,
} from '@/app/api/admin/users/[id]/route';
import { POST as createAdminCompany } from '@/app/api/admin/companies/route';
import {
  PATCH as updateAdminCompany,
} from '@/app/api/admin/companies/[id]/route';
import { POST as createBadge } from '@/app/api/admin/badges/route';
import {
  PATCH as updateBadge,
} from '@/app/api/admin/badges/[id]/route';
import { PATCH as updateSettings } from '@/app/api/admin/settings/route';
import { PATCH as approveInvite } from '@/app/api/invites/approve/route';
import { POST as approveLeaderTeamUser } from '@/app/api/leader/team/route';
import { POST as sendAlert } from '@/app/api/admin/alerts/send/route';

function request(
  path: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('privileged write actor revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trade_name TEXT,
        cnpj TEXT UNIQUE,
        sector TEXT,
        plan TEXT DEFAULT 'trial',
        is_active INTEGER DEFAULT 1,
        logo_url TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        deleted_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT DEFAULT 'hash',
        role TEXT NOT NULL,
        company_id TEXT,
        department_id TEXT,
        is_master_admin INTEGER DEFAULT 0,
        approved INTEGER DEFAULT 1,
        blocked INTEGER DEFAULT 0,
        can_approve INTEGER DEFAULT 0,
        deleted_at TEXT,
        level INTEGER DEFAULT 1,
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        must_change_password INTEGER DEFAULT 0,
        also_collaborator INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE badges (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common'
      );
      CREATE TABLE user_badges (
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL
      );
      CREATE TABLE system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL
      );
      CREATE TABLE admin_alerts (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        target_role TEXT,
        notification_type TEXT,
        audience_label TEXT,
        sent_by TEXT,
        title TEXT,
        message TEXT,
        recipients_count INTEGER
      );

      INSERT INTO companies (id, name, cnpj, is_active)
      VALUES
        ('company-a', 'Company A', '11111111111111', 1),
        ('company-b', 'Company B', '22222222222222', 1);
      INSERT INTO departments (id, company_id, name)
      VALUES ('department-a', 'company-a', 'Department A');
      INSERT INTO users (
        id, name, email, role, company_id, department_id,
        is_master_admin, approved, blocked, can_approve
      ) VALUES
        ('admin-1', 'Revoked Admin', 'admin@example.com', 'admin', NULL, NULL, 1, 1, 1, 0),
        ('rh-1', 'Revoked RH', 'rh@example.com', 'rh', 'company-a', NULL, 0, 1, 1, 0),
        ('leader-1', 'Revoked Leader', 'leader@example.com', 'lideranca', 'company-a', 'department-a', 0, 1, 1, 1),
        ('target-1', 'Target User', 'target@example.com', 'colaboradora', 'company-a', 'department-a', 0, 0, 0, 0),
        ('recipient-1', 'Recipient', 'recipient@example.com', 'colaboradora', 'company-a', 'department-a', 0, 1, 0, 0);
      INSERT INTO badges (id, name, description, icon)
      VALUES ('badge-1', 'Original badge', 'Original description', '*');
      INSERT INTO system_settings (key, value)
      VALUES ('app_name', 'Original app');
    `);
  });

  afterEach(() => {
    deps.db?.close();
    deps.db = null;
  });

  it('does not block a user after the Master Admin actor is revoked', async () => {
    const response = await updateAdminUser(
      request('/api/admin/users/target-1', 'PATCH', { action: 'block' }),
      { params: Promise.resolve({ id: 'target-1' }) },
    );
    const target = deps.db!.prepare('SELECT blocked FROM users WHERE id = ?')
      .get('target-1') as { blocked: number };

    expect(response.status).toBe(409);
    expect(target.blocked).toBe(0);
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not create a user after the Master Admin actor is revoked', async () => {
    const response = await createAdminUser(
      request('/api/admin/users', 'POST', {
        name: 'New RH',
        email: 'new-rh@example.com',
        password: 'StrongPass1!',
        role: 'rh',
        company_id: 'company-a',
      }),
      { params: Promise.resolve({}) },
    );
    const created = deps.db!.prepare('SELECT id FROM users WHERE email = ?')
      .get('new-rh@example.com');

    expect(response.status).toBe(409);
    expect(created).toBeUndefined();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not block a company after the Master Admin actor is revoked', async () => {
    const response = await updateAdminCompany(
      request('/api/admin/companies/company-b', 'PATCH', { action: 'block' }),
      { params: Promise.resolve({ id: 'company-b' }) },
    );
    const company = deps.db!.prepare('SELECT is_active FROM companies WHERE id = ?')
      .get('company-b') as { is_active: number };

    expect(response.status).toBe(409);
    expect(company.is_active).toBe(1);
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not create a company after the Master Admin actor is revoked', async () => {
    const response = await createAdminCompany(
      request('/api/admin/companies', 'POST', {
        name: 'New Company',
        cnpj: '33333333333333',
        plan: 'trial',
      }),
      { params: Promise.resolve({}) },
    );
    const created = deps.db!.prepare('SELECT id FROM companies WHERE cnpj = ?')
      .get('33333333333333');

    expect(response.status).toBe(409);
    expect(created).toBeUndefined();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not create or update badges after the Master Admin actor is revoked', async () => {
    const createResponse = await createBadge(
      request('/api/admin/badges', 'POST', {
        name: 'New badge',
        description: 'New badge description',
        icon: '+',
        points: 10,
        rarity: 'rare',
      }),
      { params: Promise.resolve({}) },
    );
    const updateResponse = await updateBadge(
      request('/api/admin/badges/badge-1', 'PATCH', { name: 'Changed badge' }),
      { params: Promise.resolve({ id: 'badge-1' }) },
    );
    const badges = deps.db!.prepare('SELECT name FROM badges ORDER BY id').all() as { name: string }[];

    expect(createResponse.status).toBe(409);
    expect(updateResponse.status).toBe(409);
    expect(badges).toEqual([{ name: 'Original badge' }]);
  });

  it('does not update settings after the Master Admin actor is revoked', async () => {
    const response = await updateSettings(
      request('/api/admin/settings', 'PATCH', { app_name: 'Changed app' }),
      { params: Promise.resolve({}) },
    );
    const setting = deps.db!.prepare('SELECT value FROM system_settings WHERE key = ?')
      .get('app_name') as { value: string };

    expect(response.status).toBe(409);
    expect(setting.value).toBe('Original app');
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not approve an invite after the RH actor is revoked', async () => {
    const response = await approveInvite(
      request('/api/invites/approve', 'PATCH', {
        userId: 'target-1',
        action: 'approve',
      }),
      { params: Promise.resolve({}) },
    );
    const target = deps.db!.prepare('SELECT approved FROM users WHERE id = ?')
      .get('target-1') as { approved: number };

    expect(response.status).toBe(409);
    expect(target.approved).toBe(0);
    expect(deps.createNotification).not.toHaveBeenCalled();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not approve a team user after the leader actor is revoked', async () => {
    const response = await approveLeaderTeamUser(
      request('/api/leader/team', 'POST', {
        targetUserId: 'target-1',
        action: 'approve',
      }),
      { params: Promise.resolve({}) },
    );
    const target = deps.db!.prepare('SELECT approved FROM users WHERE id = ?')
      .get('target-1') as { approved: number };

    expect(response.status).toBe(409);
    expect(target.approved).toBe(0);
    expect(
      deps.db!.prepare('SELECT COUNT(*) AS count FROM notifications')
        .get() as { count: number },
    ).toEqual({ count: 0 });
  });

  it('does not send alerts after the RH actor is revoked', async () => {
    const response = await sendAlert(
      request('/api/admin/alerts/send', 'POST', {
        title: 'Security notice',
        message: 'Message',
        company_id: 'company-a',
      }),
      { params: Promise.resolve({}) },
    );
    const notifications = deps.db!.prepare('SELECT COUNT(*) AS count FROM notifications')
      .get() as { count: number };

    expect(response.status).toBe(409);
    expect(notifications.count).toBe(0);
  });
});
