import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  invalidateUserTokens: vi.fn(),
  createResetToken: vi.fn(),
  deleteAllUserTokens: vi.fn(),
  enqueue: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/repositories/password-reset.repository', () => ({
  invalidateUserTokens: deps.invalidateUserTokens,
  createResetToken: deps.createResetToken,
}));

vi.mock('@/repositories/refresh-token.repository', () => ({
  deleteAllUserTokens: deps.deleteAllUserTokens,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({ enqueue: deps.enqueue }),
}));

vi.mock('@/lib/mail', () => ({ sendEmail: deps.sendEmail }));

import { requestUserPasswordReset } from '@/lib/auth/request-user-password-reset';

describe('password reset request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.invalidateUserTokens.mockResolvedValue(undefined);
    deps.createResetToken.mockResolvedValue({ id: 'reset-1' });
    deps.deleteAllUserTokens.mockResolvedValue(undefined);
    deps.enqueue.mockImplementation(async (operation: any) => {
      operation({ prepare: () => ({ run: vi.fn() }) });
    });
    deps.sendEmail.mockResolvedValue(true);
  });

  it('revokes sessions, requires a password change, and emails a one-time link', async () => {
    const result = await requestUserPasswordReset({
      id: 'user-1',
      name: 'User One',
      email: 'user@example.com',
    });

    expect(result).toEqual({ delivered: true });
    expect(deps.invalidateUserTokens).toHaveBeenCalledWith('user-1');
    expect(deps.createResetToken).toHaveBeenCalledWith(
      'user-1',
      expect.any(String),
      expect.any(String),
    );
    expect(deps.deleteAllUserTokens).toHaveBeenCalledWith('user-1');
    expect(deps.enqueue).toHaveBeenCalledOnce();
    expect(deps.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'user@example.com',
      html: expect.stringContaining('/redefinir-senha?token='),
    }));
  });
});
