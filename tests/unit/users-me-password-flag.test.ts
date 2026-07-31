import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest) =>
    handler(req, {
      auth: { userId: 'user-1', companyId: 'company-1', role: 'colaboradora' },
    }),
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({ enqueue: deps.enqueue }),
}));

vi.mock('@/repositories/user.repository', () => ({
  getUserById: deps.getUserById,
  toPublicUser: (user: unknown) => user,
}));

import { PATCH } from '@/app/api/users/me/route';

describe('user profile password flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.getUserById.mockReturnValue({ id: 'user-1' });
  });

  it('does not allow the profile API to clear the password-change requirement', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mustChangePassword: false }),
    }), { params: Promise.resolve({}) });

    expect(response.status).toBe(400);
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
});
