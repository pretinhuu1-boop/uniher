import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  enqueue: vi.fn(),
  departmentExists: false,
  writeDepartmentExists: false,
  writeStatements: [] as string[],
  logAudit: vi.fn(),
  sendEmailAsync: vi.fn(),
}));

const targetUser = {
  id: 'user-a',
  name: 'User A',
  email: 'user-a@example.com',
  role: 'colaboradora',
  company_id: 'company-a',
  blocked: 0,
};

const fakeDb = {
  prepare(sql: string) {
    return {
      get: () => {
        if (sql.includes('FROM departments')) {
          return deps.departmentExists ? { id: 'department-a' } : undefined;
        }
        if (sql.includes('FROM users WHERE id = ? AND deleted_at IS NULL')) {
          return targetUser;
        }
        if (sql.includes('SELECT company_id, name FROM users')) {
          return { company_id: 'company-a', name: 'RH User' };
        }
        if (sql.includes('SELECT name FROM companies')) {
          return { name: 'Company A' };
        }
        return undefined;
      },
    };
  },
};

vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: any) => (
    req: NextRequest,
    segmentData: { params: Promise<Record<string, string>> },
  ) => handler(req, {
    ...segmentData,
    auth: {
      userId: 'rh-a',
      role: 'rh',
      companyId: 'company-a',
      sessionVersion: 1,
    },
  }),
}));
vi.mock('@/lib/db', () => ({
  getReadDb: () => fakeDb,
  getWriteQueue: () => ({ enqueue: deps.enqueue }),
}));
vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({ checkAdminRateLimit: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logAudit: deps.logAudit }));
vi.mock('@/lib/mail', () => ({ sendEmailAsync: deps.sendEmailAsync }));
vi.mock('@/lib/mail/templates', () => ({ inviteEmailHtml: vi.fn() }));
vi.mock('@/lib/auth/request-user-password-reset', () => ({
  requestUserPasswordReset: vi.fn(),
}));

import { POST as createInvite } from '@/app/api/invites/route';
import { POST as createBatchInvites } from '@/app/api/invites/batch/route';
import { PATCH as updateRhUser } from '@/app/api/rh/users/[id]/route';

describe('department tenant write boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.departmentExists = false;
    deps.writeDepartmentExists = false;
    deps.writeStatements.length = 0;
    deps.enqueue.mockImplementation(async (
      operation: (db: any) => unknown,
    ) => operation({
      prepare(sql: string) {
        deps.writeStatements.push(sql.replace(/\s+/g, ' ').trim());
        return {
          get: () => {
            if (sql.includes('FROM departments')) {
              return deps.writeDepartmentExists
                ? { id: 'department-a' }
                : undefined;
            }
            if (sql.includes("role = 'rh'")) return { id: 'rh-a' };
            return undefined;
          },
          run: () => ({ changes: 1 }),
        };
      },
      transaction(callback: () => unknown) {
        return { immediate: callback };
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('applies role denial before evaluating production invite configuration', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const request = new NextRequest('http://localhost/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'rh-invite@example.com',
        role: 'rh',
      }),
    });

    const response = await createInvite(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(403);
    expect(deps.enqueue).not.toHaveBeenCalled();
  });

  it('rejects creating an invite with a department from another company', async () => {
    const request = new NextRequest('http://localhost/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Invitee',
        email: 'invitee@example.com',
        role: 'colaboradora',
        department_id: 'foreign-department',
      }),
    });

    const response = await createInvite(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(404);
    expect(deps.enqueue).not.toHaveBeenCalled();
    expect(deps.sendEmailAsync).not.toHaveBeenCalled();
  });

  it('rejects update_profile with a department from another company', async () => {
    const request = new NextRequest('http://localhost/api/rh/users/user-a', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        department_id: 'foreign-department',
      }),
    });

    const response = await updateRhUser(request, {
      params: Promise.resolve({ id: 'user-a' }),
    });

    expect(response.status).toBe(404);
    expect(deps.enqueue).not.toHaveBeenCalled();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('revalidates change_department inside the write transaction', async () => {
    deps.departmentExists = true;
    deps.writeDepartmentExists = false;
    const request = new NextRequest('http://localhost/api/rh/users/user-a', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'change_department',
        department_id: 'department-a',
      }),
    });

    const response = await updateRhUser(request, {
      params: Promise.resolve({ id: 'user-a' }),
    });

    expect(response.status).toBe(409);
    expect(deps.writeStatements.some((sql) =>
      sql.includes('FROM departments')
      && sql.includes('company_id = ?'),
    )).toBe(true);
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not create a batch invite when the department fails write-time validation', async () => {
    deps.departmentExists = true;
    deps.writeDepartmentExists = false;
    const request = new NextRequest('http://localhost/api/invites/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        emails: ['batch@example.com'],
        role: 'colaboradora',
        department_id: 'department-a',
      }),
    });

    const response = await createBatchInvites(request, {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ successCount: 0, errorCount: 1 });
    expect(deps.writeStatements.some((sql) =>
      sql.includes('INSERT INTO invites'),
    )).toBe(false);
    expect(deps.sendEmailAsync).not.toHaveBeenCalled();
  });
});
