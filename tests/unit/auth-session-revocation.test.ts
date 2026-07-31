import { beforeEach, describe, expect, it, vi } from 'vitest';

const authDeps = vi.hoisted(() => ({
  getRefreshTokenCookie: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  findValidToken: vi.fn(),
  createRefreshToken: vi.fn(),
  deleteRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  deleteAllUserTokens: vi.fn(),
  getUserById: vi.fn(),
  getCompanyById: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  getRefreshTokenCookie: authDeps.getRefreshTokenCookie,
}));

vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: authDeps.signAccessToken,
  signRefreshToken: authDeps.signRefreshToken,
  verifyRefreshToken: authDeps.verifyRefreshToken,
}));

vi.mock('@/repositories/refresh-token.repository', () => ({
  findValidToken: authDeps.findValidToken,
  createRefreshToken: authDeps.createRefreshToken,
  deleteRefreshToken: authDeps.deleteRefreshToken,
  rotateRefreshToken: authDeps.rotateRefreshToken,
  deleteAllUserTokens: authDeps.deleteAllUserTokens,
}));

vi.mock('@/repositories/user.repository', () => ({
  getUserById: authDeps.getUserById,
}));

vi.mock('@/repositories/company.repository', () => ({
  getCompanyById: authDeps.getCompanyById,
}));

import { refresh } from '@/services/auth.service';

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    role: 'colaboradora',
    company_id: 'company-1',
    is_master_admin: 0,
    blocked: 0,
    approved: 1,
    deleted_at: null,
    must_change_password: 0,
    password_reset_required: 0,
    session_version: 7,
    ...overrides,
  };
}

function activeCompany(overrides: Record<string, unknown> = {}) {
  return {
    id: 'company-1',
    is_active: 1,
    deleted_at: null,
    ...overrides,
  };
}

describe('auth session revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authDeps.getRefreshTokenCookie.mockResolvedValue('old-refresh-token');
    authDeps.verifyRefreshToken.mockResolvedValue({ userId: 'user-1' });
    authDeps.findValidToken.mockReturnValue({ id: 'stored-token', user_id: 'user-1' });
    authDeps.getUserById.mockReturnValue(activeUser());
    authDeps.getCompanyById.mockReturnValue(activeCompany());
    authDeps.deleteRefreshToken.mockResolvedValue(undefined);
    authDeps.rotateRefreshToken.mockResolvedValue({
      id: 'new-token',
      user_id: 'user-1',
    });
    authDeps.deleteAllUserTokens.mockResolvedValue(undefined);
    authDeps.signAccessToken.mockResolvedValue('new-access-token');
    authDeps.signRefreshToken.mockResolvedValue('new-refresh-token');
    authDeps.createRefreshToken.mockResolvedValue({ id: 'new-token', user_id: 'user-1' });
  });

  it('rotates refresh tokens for an active approved user in an active company', async () => {
    await expect(refresh()).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(authDeps.signAccessToken).toHaveBeenCalledWith({
      userId: 'user-1',
      role: 'colaboradora',
      companyId: 'company-1',
      sessionVersion: 7,
      isMasterAdmin: false,
      mustChangePassword: false,
      passwordResetRequired: false,
    });
    expect(authDeps.rotateRefreshToken).toHaveBeenCalledWith(
      'user-1',
      'old-refresh-token',
      'new-refresh-token',
    );
    expect(authDeps.deleteRefreshToken).not.toHaveBeenCalled();
    expect(authDeps.createRefreshToken).not.toHaveBeenCalled();
  });

  it.each([
    ['blocked user', { blocked: 1 }],
    ['deleted user', { deleted_at: '2026-07-27T10:00:00.000Z' }],
    ['unapproved user', { approved: 0 }],
    ['user with unknown approval state', { approved: null }],
  ])('rejects refresh for a %s and revokes stored tokens', async (_state, overrides) => {
    authDeps.getUserById.mockReturnValue(activeUser(overrides));

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 });

    expect(authDeps.deleteAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(authDeps.deleteRefreshToken).not.toHaveBeenCalled();
    expect(authDeps.rotateRefreshToken).not.toHaveBeenCalled();
    expect(authDeps.createRefreshToken).not.toHaveBeenCalled();
  });

  it.each([
    ['missing company', undefined],
    ['inactive company', activeCompany({ is_active: 0 })],
    ['deleted company', activeCompany({ deleted_at: '2026-07-27T10:00:00.000Z' })],
  ])('rejects refresh when the user company is %s', async (_state, company) => {
    authDeps.getCompanyById.mockReturnValue(company);

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 });

    expect(authDeps.deleteAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(authDeps.deleteRefreshToken).not.toHaveBeenCalled();
    expect(authDeps.rotateRefreshToken).not.toHaveBeenCalled();
    expect(authDeps.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects refresh while an email-token password reset is required', async () => {
    authDeps.getUserById.mockReturnValue(activeUser({
      must_change_password: 1,
      password_reset_required: 1,
    }));

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 });

    expect(authDeps.deleteAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(authDeps.signAccessToken).not.toHaveBeenCalled();
    expect(authDeps.createRefreshToken).not.toHaveBeenCalled();
  });

  it('rejects replay when the current refresh token loses the atomic rotation race', async () => {
    authDeps.rotateRefreshToken.mockResolvedValueOnce(null);

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 });

    expect(authDeps.createRefreshToken).not.toHaveBeenCalled();
  });
});
