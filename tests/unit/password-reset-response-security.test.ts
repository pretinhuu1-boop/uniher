import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  requestUserPasswordReset: vi.fn(),
  logAudit: vi.fn(),
  checkAdminRateLimit: vi.fn(),
  initDb: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withMasterAdmin: (handler: any) => (req: NextRequest, segment: any) =>
    handler(req, {
      params: segment.params,
      auth: { userId: 'admin-1', companyId: '', role: 'admin', isMasterAdmin: true },
    }),
  withRole: (..._roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => handler(req, {
      params: segment.params,
      auth: { userId: 'rh-1', companyId: 'company-a', role: 'rh' },
    }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => ({
    prepare: () => ({
      get: () => ({
        id: 'user-1',
        name: 'User One',
        email: 'user@example.com',
        role: 'colaboradora',
        company_id: 'company-a',
        blocked: 0,
      }),
    }),
  }),
  getWriteQueue: vi.fn(),
}));

vi.mock('@/lib/db/init', () => ({ initDb: deps.initDb }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkAdminRateLimit: deps.checkAdminRateLimit,
}));
vi.mock('@/lib/audit', () => ({ logAudit: deps.logAudit }));
vi.mock('@/lib/auth/request-user-password-reset', () => ({
  requestUserPasswordReset: deps.requestUserPasswordReset,
}));

import { PATCH as adminPatch } from '@/app/api/admin/users/[id]/route';
import { PATCH as rhPatch } from '@/app/api/rh/users/[id]/route';

function resetRequest(url: string) {
  return new NextRequest(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset_password' }),
  });
}

describe('administrative password reset response security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.requestUserPasswordReset.mockResolvedValue({ delivered: true });
  });

  it.each([
    ['admin', adminPatch, 'http://localhost/api/admin/users/user-1'],
    ['rh', rhPatch, 'http://localhost/api/rh/users/user-1'],
  ])('returns no plaintext credential for the %s reset flow', async (_role, handler, url) => {
    const response = await handler(
      resetRequest(url),
      { params: Promise.resolve({ id: 'user-1' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      message: 'Link de redefinicao enviado para o email cadastrado',
    });
    expect(JSON.stringify(body).toLowerCase()).not.toContain('password');
    expect(JSON.stringify(body).toLowerCase()).not.toContain('senha');
    expect(deps.requestUserPasswordReset).toHaveBeenCalledWith(expect.objectContaining({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
      ...(_role === 'rh'
        ? { expectedCompanyId: 'company-a', expectedActorId: 'rh-1' }
        : {}),
    }));
  });
});
