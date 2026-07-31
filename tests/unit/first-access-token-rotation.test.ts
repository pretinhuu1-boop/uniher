import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  getUser: vi.fn(),
  enqueue: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  deleteAllUserTokens: vi.fn(),
  createRefreshToken: vi.fn(),
  setAuthCookiesOnResponse: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest) =>
    handler(req, {
      auth: { userId: 'user-1', role: 'colaboradora', companyId: 'company-1' },
    }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => ({
    prepare: () => ({ get: deps.getUser }),
  }),
  getWriteQueue: () => ({ enqueue: deps.enqueue }),
}));

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: deps.signAccessToken,
  signRefreshToken: deps.signRefreshToken,
}));

vi.mock('@/repositories/refresh-token.repository', () => ({
  deleteAllUserTokens: deps.deleteAllUserTokens,
  createRefreshToken: deps.createRefreshToken,
}));

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: deps.setAuthCookiesOnResponse,
}));

import { POST } from '@/app/api/auth/confirm-first-access/route';

describe('first access token rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.getUser.mockReturnValue({
      id: 'user-1',
      role: 'colaboradora',
      company_id: 'company-1',
      is_master_admin: 0,
      must_change_password: 0,
      password_reset_required: 0,
    });
    deps.enqueue.mockImplementation(async (operation: (db: unknown) => unknown) =>
      operation({ prepare: () => ({ run: vi.fn() }) }),
    );
    deps.signAccessToken.mockResolvedValue('clean-access-token');
    deps.signRefreshToken.mockResolvedValue('new-refresh-token');
    deps.deleteAllUserTokens.mockResolvedValue(undefined);
    deps.createRefreshToken.mockResolvedValue(undefined);
    deps.setAuthCookiesOnResponse.mockImplementation((response: unknown) => response);
  });

  it('rotates stale tokens even when the password flag was already cleared', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/auth/confirm-first-access', {
        method: 'POST',
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(deps.signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      mustChangePassword: false,
    }));
    expect(deps.deleteAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(deps.createRefreshToken).toHaveBeenCalledWith('user-1', 'new-refresh-token');
    expect(deps.setAuthCookiesOnResponse).toHaveBeenCalledWith(
      expect.anything(),
      'clean-access-token',
      'new-refresh-token',
    );
  });

  it('refuses token rotation when an email-token reset is required', async () => {
    deps.getUser.mockReturnValue({
      id: 'user-1',
      role: 'colaboradora',
      company_id: 'company-1',
      is_master_admin: 0,
      must_change_password: 1,
      password_reset_required: 1,
    });

    const response = await POST(
      new NextRequest('http://localhost/api/auth/confirm-first-access', {
        method: 'POST',
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(403);
    expect(deps.signAccessToken).not.toHaveBeenCalled();
    expect(deps.createRefreshToken).not.toHaveBeenCalled();
  });

  it('refuses to clear a required password change without a new password', async () => {
    deps.getUser.mockReturnValue({
      id: 'user-1',
      role: 'colaboradora',
      company_id: 'company-1',
      is_master_admin: 0,
      must_change_password: 1,
      password_reset_required: 0,
    });

    const response = await POST(
      new NextRequest('http://localhost/api/auth/confirm-first-access', {
        method: 'POST',
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(403);
    expect(deps.enqueue).not.toHaveBeenCalled();
    expect(deps.signAccessToken).not.toHaveBeenCalled();
    expect(deps.createRefreshToken).not.toHaveBeenCalled();
  });
});
