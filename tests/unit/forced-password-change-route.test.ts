import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  auth: {
    userId: 'user-1',
    role: 'colaboradora',
    companyId: 'company-1',
    isMasterAdmin: false,
    mustChangePassword: true,
    passwordResetRequired: false,
    sessionVersion: 0,
  },
  hashPassword: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  completeForcedPasswordChange: vi.fn(),
  setAuthCookiesOnResponse: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest) =>
    handler(req, { auth: deps.auth }),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: deps.hashPassword,
}));

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: deps.signAccessToken,
  signRefreshToken: deps.signRefreshToken,
}));

vi.mock('@/repositories/first-access.repository', () => ({
  completeForcedPasswordChange: deps.completeForcedPasswordChange,
}));

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: deps.setAuthCookiesOnResponse,
}));

vi.mock('@/lib/db/init', () => ({
  initDb: vi.fn(),
}));

import { POST } from '@/app/api/auth/change-password/route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('forced password change route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.auth.mustChangePassword = true;
    deps.auth.passwordResetRequired = false;
    deps.hashPassword.mockResolvedValue('new-password-hash');
    deps.signAccessToken.mockResolvedValue('new-access-token');
    deps.signRefreshToken.mockResolvedValue('new-refresh-token');
    deps.completeForcedPasswordChange.mockResolvedValue(1);
    deps.setAuthCookiesOnResponse.mockImplementation((response: unknown) => response);
  });

  it('changes the password and rotates the session in one operation', async () => {
    const response = await POST(
      request({ newPassword: 'NewPassword@2026' }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(deps.completeForcedPasswordChange).toHaveBeenCalledWith({
      userId: 'user-1',
      passwordHash: 'new-password-hash',
      refreshToken: 'new-refresh-token',
    });
    expect(deps.signAccessToken).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      mustChangePassword: false,
      sessionVersion: 1,
    }));
    expect(deps.setAuthCookiesOnResponse).toHaveBeenCalledWith(
      expect.anything(),
      'new-access-token',
      'new-refresh-token',
    );
  });

  it('rejects use by a session that is not in forced-password-change state', async () => {
    deps.auth.mustChangePassword = false;

    const response = await POST(
      request({ newPassword: 'NewPassword@2026' }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(403);
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.completeForcedPasswordChange).not.toHaveBeenCalled();
  });
});
