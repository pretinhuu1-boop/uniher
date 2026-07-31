import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as any }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (..._roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => {
      const role = req.headers.get('x-test-role') ?? 'lideranca';
      return handler(req, {
        params: segment.params,
        auth: {
          userId: role === 'rh' ? 'rh-a' : 'leader-a',
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
      CREATE TABLE users (id TEXT PRIMARY KEY, company_id TEXT, name TEXT);
      CREATE TABLE departments (id TEXT PRIMARY KEY, name TEXT);
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
      INSERT INTO users (id, company_id, name) VALUES
        ('leader-a', 'company-a', 'Leader A'),
        ('rh-a', 'company-a', 'RH A');
      INSERT INTO invites (
        id, company_id, email, role, token, status, invited_by, expires_at, name, created_at
      ) VALUES (
        'invite-1', 'company-a', 'invitee@example.com', 'colaboradora',
        'raw-secret-token', 'pending', 'rh-a', '2026-08-01T00:00:00Z',
        'Invitee', '2026-07-31T00:00:00Z'
      );
    `);
  });

  it('does not expose raw invitation tokens to leadership', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/invites', {
        headers: { 'x-test-role': 'lideranca' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0]).not.toHaveProperty('token');
    expect(JSON.stringify(body)).not.toContain('raw-secret-token');
  });

  it('keeps the token available to RH for copy and revocation workflows', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/invites', {
        headers: { 'x-test-role': 'rh' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(body.invites[0].token).toBe('raw-secret-token');
  });
});
