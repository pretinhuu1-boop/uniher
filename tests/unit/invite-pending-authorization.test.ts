import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as Database.Database | null }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (...roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => {
      const role = req.headers.get('x-test-role') ?? 'rh';
      if (!roles.includes(role)) {
        return Response.json({ error: 'Permissao insuficiente' }, { status: 403 });
      }
      return handler(req, {
        params: segment.params,
        auth: {
          userId: req.headers.get('x-test-user') ?? 'rh-active',
          companyId: req.headers.get('x-test-company') ?? 'company-a',
          role,
        },
      });
    },
}));

vi.mock('@/lib/db', () => ({ getReadDb: () => deps.db }));
vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));

import { GET } from '@/app/api/invites/pending/route';

function request(role: string, userId: string): NextRequest {
  return new NextRequest('http://localhost/api/invites/pending', {
    headers: {
      'x-test-role': role,
      'x-test-user': userId,
      'x-test-company': 'company-a',
    },
  });
}

describe('pending invite authorization', () => {
  beforeEach(() => {
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        is_active INTEGER NOT NULL DEFAULT 1,
        deleted_at TEXT
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 1,
        blocked INTEGER NOT NULL DEFAULT 0,
        can_approve INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        invite_token TEXT
      );

      INSERT INTO companies (id, is_active) VALUES
        ('company-a', 1),
        ('company-b', 1),
        ('company-inactive', 0);
      INSERT INTO departments (id, company_id, name) VALUES
        ('department-a', 'company-a', 'Financeiro'),
        ('department-b', 'company-a', 'Operacoes'),
        ('department-other', 'company-b', 'Outra empresa');
      INSERT INTO users (
        id, company_id, department_id, name, email, role, approved, blocked,
        can_approve, deleted_at, created_at, invite_token
      ) VALUES
        ('rh-active', 'company-a', NULL, 'RH ativo', 'rh@example.com', 'rh', 1, 0, 0, NULL, '2026-07-01', NULL),
        ('rh-revoked', 'company-a', NULL, 'RH revogado', 'revoked@example.com', 'rh', 0, 0, 0, NULL, '2026-07-01', NULL),
        ('rh-blocked', 'company-a', NULL, 'RH bloqueado', 'blocked@example.com', 'rh', 1, 1, 0, NULL, '2026-07-01', NULL),
        ('leader-active', 'company-a', 'department-a', 'Lider ativa', 'leader@example.com', 'lideranca', 1, 0, 1, NULL, '2026-07-01', NULL),
        ('leader-no-approval', 'company-a', 'department-a', 'Lider sem permissao', 'no-approval@example.com', 'lideranca', 1, 0, 0, NULL, '2026-07-01', NULL),
        ('leader-no-department', 'company-a', NULL, 'Lider sem departamento', 'no-dept@example.com', 'lideranca', 1, 0, 1, NULL, '2026-07-01', NULL),
        ('leader-empty-department', 'company-a', '', 'Lider departamento vazio', 'empty-dept@example.com', 'lideranca', 1, 0, 1, NULL, '2026-07-01', NULL),
        ('pending-a', 'company-a', 'department-a', 'Pendente A', 'pending-a@example.com', 'colaboradora', 0, 0, 0, NULL, '2026-07-20', 'raw-secret-a'),
        ('pending-b', 'company-a', 'department-b', 'Pendente B', 'pending-b@example.com', 'colaboradora', 0, 0, 0, NULL, '2026-07-21', 'raw-secret-b'),
        ('pending-rh', 'company-a', NULL, 'Pendente RH', 'pending-rh@example.com', 'rh', 0, 0, 0, NULL, '2026-07-22', 'raw-secret-rh'),
        ('pending-other', 'company-b', 'department-other', 'Outra empresa', 'other@example.com', 'colaboradora', 0, 0, 0, NULL, '2026-07-23', 'raw-secret-other'),
        ('approved-a', 'company-a', 'department-a', 'Aprovada', 'approved@example.com', 'colaboradora', 1, 0, 0, NULL, '2026-07-24', 'raw-secret-approved'),
        ('deleted-a', 'company-a', 'department-a', 'Excluida', 'deleted@example.com', 'colaboradora', 0, 0, 0, '2026-07-25', '2026-07-25', 'raw-secret-deleted'),
        ('rh-inactive-company', 'company-inactive', NULL, 'RH empresa inativa', 'inactive@example.com', 'rh', 1, 0, 0, NULL, '2026-07-01', NULL);
    `);
  });

  afterEach(() => {
    deps.db?.close();
    deps.db = null;
  });

  it('allows an active RH to see only pending users from its company', async () => {
    const response = await GET(request('rh', 'rh-active'), { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users.map((user: any) => user.id).sort()).toEqual([
      'pending-a',
      'pending-b',
      'pending-rh',
      'rh-revoked',
    ]);
    expect(JSON.stringify(body)).not.toContain('raw-secret');
    expect(body.users.every((user: any) => !('token' in user) && !('invite_token' in user))).toBe(true);
  });

  it('limits an active leader approver to pending collaborators in its department', async () => {
    const response = await GET(request('lideranca', 'leader-active'), { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users.map((user: any) => user.id)).toEqual(['pending-a']);
    expect(JSON.stringify(body)).not.toContain('raw-secret');
  });

  it.each([
    ['rh', 'rh-revoked'],
    ['rh', 'rh-blocked'],
    ['rh', 'rh-inactive-company'],
    ['lideranca', 'leader-no-approval'],
    ['lideranca', 'leader-no-department'],
    ['lideranca', 'leader-empty-department'],
  ])('fails closed for inactive or unauthorized %s actor %s', async (role, userId) => {
    const response = await GET(request(role, userId), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Permissao insuficiente' });
  });
});
