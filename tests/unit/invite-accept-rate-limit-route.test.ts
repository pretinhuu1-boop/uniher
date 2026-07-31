import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '@/lib/errors';

const deps = vi.hoisted(() => ({
  checkInviteAcceptRateLimit: vi.fn(),
  hashPassword: vi.fn(),
  initDb: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  setAuthCookiesOnResponse: vi.fn(),
  enqueue: vi.fn(),
  writeBatches: [] as string[][],
}));

const invite = {
  id: 'invite-a',
  company_id: 'company-a',
  department_id: 'department-a',
  email: 'invitee@example.com',
  role: 'colaboradora',
  expires_at: '2099-08-01T00:00:00Z',
};

const fakeDb = {
  prepare(sql: string) {
    return {
      get: () => sql.includes('FROM invites') ? invite : undefined,
      run: () => undefined,
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
vi.mock('@/lib/db/init', () => ({ initDb: deps.initDb }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkInviteAcceptRateLimit: deps.checkInviteAcceptRateLimit,
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword: deps.hashPassword }));
vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: deps.signAccessToken,
  signRefreshToken: deps.signRefreshToken,
}));
vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: deps.setAuthCookiesOnResponse,
}));

import { POST } from '@/app/api/invites/[token]/route';

function registerRequest() {
  return new Request('http://localhost/api/invites/raw-invite-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.17' },
    body: JSON.stringify({ name: 'Invitee', password: 'Strong1!' }),
  });
}

describe('POST /api/invites/[token] rate limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.writeBatches.length = 0;
    deps.checkInviteAcceptRateLimit.mockResolvedValue(undefined);
    deps.hashPassword.mockResolvedValue('password-hash');
    deps.signAccessToken.mockResolvedValue('access-token');
    deps.signRefreshToken.mockResolvedValue('refresh-token');
    deps.setAuthCookiesOnResponse.mockImplementation((response) => response);
    deps.enqueue.mockImplementation(async (operation: (db: typeof fakeDb) => unknown) => {
      const statements: string[] = [];
      const writeDb = {
        prepare(sql: string) {
          statements.push(sql.replace(/\s+/g, ' ').trim());
          return { run: () => undefined };
        },
      };
      operation(writeDb as typeof fakeDb);
      deps.writeBatches.push(statements);
    });
  });

  it('returns 429 before database initialization, bcrypt, or writes', async () => {
    deps.checkInviteAcceptRateLimit.mockRejectedValueOnce(
      new RateLimitError('Muitas tentativas de aceitar este convite. Aguarde 1 minuto.'),
    );
    const req = registerRequest();

    const response = await POST(req, {
      params: Promise.resolve({ token: 'raw-invite-token' }),
    });

    expect(response.status).toBe(429);
    expect(deps.checkInviteAcceptRateLimit).toHaveBeenCalledWith(req, 'raw-invite-token');
    expect(deps.initDb).not.toHaveBeenCalled();
    expect(deps.hashPassword).not.toHaveBeenCalled();
    expect(deps.enqueue).not.toHaveBeenCalled();
  });

  it('checks the limit before bcrypt and preserves invite consumption in one write callback', async () => {
    const order: string[] = [];
    deps.checkInviteAcceptRateLimit.mockImplementationOnce(async () => { order.push('rate-limit'); });
    deps.hashPassword.mockImplementationOnce(async () => {
      order.push('bcrypt');
      return 'password-hash';
    });

    const response = await POST(registerRequest(), {
      params: Promise.resolve({ token: 'raw-invite-token' }),
    });

    expect(response.status).toBe(200);
    expect(order).toEqual(['rate-limit', 'bcrypt']);
    expect(deps.writeBatches[0].some((sql) => sql.includes('INSERT INTO users'))).toBe(true);
    expect(deps.writeBatches[0].some((sql) => sql.includes("UPDATE invites SET status = 'accepted'"))).toBe(true);
  });
});
