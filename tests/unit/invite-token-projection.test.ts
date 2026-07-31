import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as any }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (...roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => {
      const role = req.headers.get('x-test-role') ?? 'lideranca';
      if (!roles.includes(role)) {
        return Response.json({ error: 'Permissao insuficiente' }, { status: 403 });
      }
      return handler(req, {
        params: segment.params,
        auth: {
          userId: `${role}-a`,
          companyId: 'company-a',
          role,
        },
      });
    },
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: vi.fn(),
}));

vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));
vi.mock('@/lib/mail', () => ({ sendEmailAsync: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({ checkAdminRateLimit: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }));

import { GET } from '@/app/api/invites/route';

describe('invite token projection', () => {
  beforeEach(() => {
    deps.db?.close();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        name TEXT
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT
      );
      CREATE TABLE invites (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        email TEXT,
        role TEXT,
        department_id TEXT,
        token TEXT,
        status TEXT,
        invited_by TEXT,
        expires_at TEXT,
        name TEXT,
        created_at TEXT
      );
      INSERT INTO users (id, company_id, department_id, name) VALUES
        ('lideranca-a', 'company-a', 'department-a', 'Leader A'),
        ('rh-a', 'company-a', NULL, 'RH A'),
        ('admin-a', 'company-a', NULL, 'Admin A');
      INSERT INTO departments (id, company_id, name) VALUES
        ('department-a', 'company-a', 'Financeiro'),
        ('department-b', 'company-a', 'Operacoes'),
        ('department-other', 'company-b', 'Outra empresa');
      INSERT INTO invites (
        id, company_id, email, role, department_id, token, status,
        invited_by, expires_at, name, created_at
      ) VALUES
        (
          'invite-a', 'company-a', 'financeiro@example.com', 'colaboradora',
          'department-a', 'raw-secret-token-a', 'pending', 'rh-a',
          '2026-08-01T00:00:00Z', 'Financeiro', '2026-07-31T00:00:00Z'
        ),
        (
          'invite-b', 'company-a', 'operacoes@example.com', 'colaboradora',
          'department-b', 'raw-secret-token-b', 'pending', 'rh-a',
          '2026-08-01T00:00:00Z', 'Operacoes', '2026-07-31T00:00:00Z'
        ),
        (
          'invite-other', 'company-b', 'other@example.com', 'colaboradora',
          'department-other', 'raw-secret-token-other', 'pending', 'rh-a',
          '2026-08-01T00:00:00Z', 'Other', '2026-07-31T00:00:00Z'
        );
    `);
  });

  it('limits leadership to its department with the minimum read-only projection', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/invites', {
        headers: { 'x-test-role': 'lideranca' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0].email).toBe('financeiro@example.com');
    expect(Object.keys(body.invites[0]).sort()).toEqual([
      'department_name',
      'email',
      'expires_at',
      'id',
      'invited_by_name',
      'role',
      'status',
    ]);
    expect(body.invites[0]).not.toHaveProperty('token');
    expect(JSON.stringify(body)).not.toContain('raw-secret-token-a');
    expect(JSON.stringify(body)).not.toContain('raw-secret-token-b');
  });

  it.each(['rh', 'admin'])('keeps company-wide token access for authorized %s users', async (role) => {
    const response = await GET(
      new NextRequest('http://localhost/api/invites', {
        headers: { 'x-test-role': role },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invites).toHaveLength(2);
    expect(body.invites.map((invite: any) => invite.token).sort()).toEqual([
      'raw-secret-token-a',
      'raw-secret-token-b',
    ]);
  });
});
