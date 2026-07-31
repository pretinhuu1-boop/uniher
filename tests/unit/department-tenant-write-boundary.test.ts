import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  enqueue: vi.fn(),
  departmentExists: false,
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
        return undefined;
      },
    };
  },
};

vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: unknown) => handler,
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
import { PATCH as updateRhUser } from '@/app/api/rh/users/[id]/route';

describe('department tenant write boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.departmentExists = false;
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
      auth: {
        userId: 'rh-a',
        role: 'rh',
        companyId: 'company-a',
        sessionVersion: 1,
      },
      params: Promise.resolve({}),
    } as any);

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
      auth: {
        userId: 'rh-a',
        role: 'rh',
        companyId: 'company-a',
        sessionVersion: 1,
      },
      params: Promise.resolve({ id: 'user-a' }),
    } as any);

    expect(response.status).toBe(404);
    expect(deps.enqueue).not.toHaveBeenCalled();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });
});
