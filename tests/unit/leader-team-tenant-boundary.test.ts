import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as any }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (..._roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => handler(req, {
      params: segment.params,
      auth: {
        userId: 'leader-a',
        companyId: 'company-a',
        role: 'lideranca',
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (operation: any) => operation(deps.db),
  }),
}));

vi.mock('@/lib/db/init', () => ({
  initDb: vi.fn(),
}));

import { POST } from '@/app/api/leader/team/route';

describe('leader team tenant boundary', () => {
  beforeEach(() => {
    deps.db?.close();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        role TEXT,
        approved INTEGER DEFAULT 0,
        blocked INTEGER DEFAULT 0,
        can_approve INTEGER DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
      );
      INSERT INTO companies (id, is_active)
      VALUES ('company-a', 1), ('company-b', 1);
      CREATE TABLE notifications (
        id TEXT,
        user_id TEXT,
        type TEXT,
        title TEXT,
        message TEXT
      );
      INSERT INTO users (id, company_id, department_id, role, approved, can_approve)
      VALUES
        ('leader-a', 'company-a', 'shared-department', 'lideranca', 1, 1),
        ('target-b', 'company-b', 'shared-department', 'colaboradora', 0, 0);
    `);
  });

  it('does not approve a same-department user from another company', async () => {
    const request = new NextRequest('http://localhost/api/leader/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', targetUserId: 'target-b' }),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const target = deps.db.prepare('SELECT approved FROM users WHERE id = ?')
      .get('target-b') as { approved: number };

    expect(response.status).toBe(404);
    expect(target.approved).toBe(0);
  });
});
