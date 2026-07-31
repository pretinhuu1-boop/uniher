import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  beginAdministrativePasswordReset: vi.fn(),
  hashPassword: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/repositories/password-reset.repository', () => ({
  beginAdministrativePasswordReset: deps.beginAdministrativePasswordReset,
}));

vi.mock('@/lib/mail', () => ({ sendEmail: deps.sendEmail }));
vi.mock('@/lib/auth/password', () => ({ hashPassword: deps.hashPassword }));

import { requestUserPasswordReset } from '@/lib/auth/request-user-password-reset';

describe('password reset request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.beginAdministrativePasswordReset.mockResolvedValue(true);
    deps.hashPassword.mockResolvedValue('replacement-password-hash');
    deps.sendEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('invalidates the old password and sessions only after the link is delivered', async () => {
    const result = await requestUserPasswordReset({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
    });

    expect(result).toEqual({ delivered: true });
    expect(deps.hashPassword).toHaveBeenCalledWith(expect.any(String));
    expect(deps.beginAdministrativePasswordReset).toHaveBeenCalledWith({
      userId: 'user-1',
      token: expect.any(String),
      expiresAt: expect.any(String),
      replacementPasswordHash: 'replacement-password-hash',
      expectedEmail: 'user@example.com',
    });
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      html: expect.stringContaining('/redefinir-senha?token='),
    }));
    expect(deps.sendEmail.mock.invocationCallOrder[0]).toBeLessThan(
      deps.beginAdministrativePasswordReset.mock.invocationCallOrder[0],
    );
  });

  it('keeps the account unchanged when the reset email is not delivered', async () => {
    deps.sendEmail.mockResolvedValue(false);

    const result = await requestUserPasswordReset({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
    });

    expect(result).toEqual({ delivered: false });
    expect(deps.beginAdministrativePasswordReset).not.toHaveBeenCalled();
  });

  it('carries the RH tenant boundary into the reset transaction', async () => {
    await requestUserPasswordReset({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
      expectedCompanyId: 'company-a',
      expectedActorId: 'rh-1',
    });

    expect(deps.beginAdministrativePasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedEmail: 'user@example.com',
        expectedCompanyId: 'company-a',
        expectedActorId: 'rh-1',
      }),
    );
  });

  it('fails closed before sending when production reset origin is not HTTPS UniHER', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

    await expect(requestUserPasswordReset({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
    })).rejects.toThrow('Invalid production application origin');

    expect(deps.sendEmail).not.toHaveBeenCalled();
    expect(deps.beginAdministrativePasswordReset).not.toHaveBeenCalled();
  });
});
