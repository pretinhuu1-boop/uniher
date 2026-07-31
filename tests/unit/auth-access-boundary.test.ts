import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const authBoundary = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  isTokenBlacklisted: vi.fn(),
  verifyAccessToken: vi.fn(),
  getUserById: vi.fn(),
  getCompanyById: vi.fn(),
}));

vi.mock('@/lib/auth/cookies', () => ({
  getAccessToken: authBoundary.getAccessToken,
}));

vi.mock('@/lib/auth/token-blacklist', () => ({
  isTokenBlacklisted: authBoundary.isTokenBlacklisted,
}));

vi.mock('@/lib/auth/jwt', () => ({
  verifyAccessToken: authBoundary.verifyAccessToken,
}));

vi.mock('@/repositories/user.repository', () => ({
  getUserById: authBoundary.getUserById,
}));

vi.mock('@/repositories/company.repository', () => ({
  getCompanyById: authBoundary.getCompanyById,
}));

import { withAuth, withRole } from '@/lib/auth/middleware';

const segmentData = { params: Promise.resolve({}) };

function requestWithBearerToken() {
  return new NextRequest('http://localhost/api/protected', {
    headers: { Authorization: 'Bearer valid-token' },
  });
}

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

describe('authenticated API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authBoundary.getAccessToken.mockResolvedValue(undefined);
    authBoundary.isTokenBlacklisted.mockReturnValue(false);
    authBoundary.verifyAccessToken.mockResolvedValue({
      userId: 'user-1',
      role: 'admin',
      companyId: 'other-company',
      isMasterAdmin: true,
    });
    authBoundary.getUserById.mockReturnValue(activeUser());
    authBoundary.getCompanyById.mockReturnValue(activeCompany());
  });

  it('uses persisted role and tenant instead of stale JWT authorization claims', async () => {
    const handler = vi.fn(async (_req, context) =>
      NextResponse.json({ auth: context.auth }),
    );
    const response = await withAuth(handler)(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({
        auth: {
          userId: 'user-1',
          role: 'colaboradora',
          companyId: 'company-1',
          isMasterAdmin: false,
          mustChangePassword: false,
        },
      }),
    );
  });

  it.each([
    ['blocked user', { blocked: 1 }],
    ['deleted user', { deleted_at: '2026-07-27T10:00:00.000Z' }],
    ['unapproved user', { approved: 0 }],
  ])('rejects access for a %s before running the handler', async (_state, overrides) => {
    authBoundary.getUserById.mockReturnValue(activeUser(overrides));
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const response = await withAuth(handler)(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    ['missing company', undefined],
    ['inactive company', activeCompany({ is_active: 0 })],
    ['deleted company', activeCompany({ deleted_at: '2026-07-27T10:00:00.000Z' })],
  ])('rejects access when the user company is %s', async (_state, company) => {
    authBoundary.getCompanyById.mockReturnValue(company);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const response = await withAuth(handler)(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('applies private no-store headers to authenticated responses', async () => {
    const response = await withAuth(async () =>
      NextResponse.json({ ok: true }, { headers: { Vary: 'Accept-Encoding' } }),
    )(requestWithBearerToken(), segmentData);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Accept-Encoding, Cookie, Authorization');
  });

  it('authorizes roles from persisted state', async () => {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const response = await withRole('admin')(handler)(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('blocks normal APIs when persisted state requires a password change', async () => {
    authBoundary.getUserById.mockReturnValue(activeUser({ must_change_password: 1 }));
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));

    const response = await withAuth(handler)(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows the password-change API while a password change is required', async () => {
    authBoundary.getUserById.mockReturnValue(activeUser({ must_change_password: 1 }));
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest('http://localhost/api/users/me/change-password', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const response = await withAuth(handler)(request, segmentData);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});
