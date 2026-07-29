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

describe('authenticated response cache policy', () => {
  beforeEach(() => {
    authBoundary.getAccessToken.mockResolvedValue(undefined);
    authBoundary.isTokenBlacklisted.mockReturnValue(false);
    authBoundary.verifyAccessToken.mockResolvedValue({
      userId: 'user-1',
      role: 'colaboradora',
      companyId: 'company-1',
    });
    authBoundary.getUserById.mockReturnValue(activeUser());
    authBoundary.getCompanyById.mockReturnValue(activeCompany());
  });

  it('overrides legacy cache headers and merges Vary tokens on handler responses', async () => {
    const protectedHandler = withAuth(async () =>
      NextResponse.json(
        { ok: true },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Vary: 'Accept-Encoding, cookie, Origin, Accept-Encoding',
          },
        },
      ),
    );

    const response = await protectedHandler(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Accept-Encoding, Origin, Cookie');
  });

  it('keeps a wildcard Vary token exclusive', async () => {
    const protectedHandler = withAuth(async () =>
      NextResponse.json(
        { ok: true },
        { headers: { Vary: '*' } },
      ),
    );

    const response = await protectedHandler(requestWithBearerToken(), segmentData);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('*');
  });

  it('adds private no-store headers to unauthenticated rejections', async () => {
    const protectedHandler = withAuth(async () => NextResponse.json({ ok: true }));

    const response = await protectedHandler(
      new NextRequest('http://localhost/api/protected'),
      segmentData,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
  });

  it('adds private no-store headers to withRole authorization rejections', async () => {
    const protectedHandler = withRole('rh')(async () =>
      NextResponse.json({ ok: true }),
    );

    const response = await protectedHandler(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Cookie');
  });

  it.each([
    ['blocked user', { blocked: 1 }],
    ['deleted user', { deleted_at: '2026-07-27T10:00:00.000Z' }],
    ['unapproved user', { approved: 0 }],
  ])('rejects access tokens for a %s before running the handler', async (_state, overrides) => {
    authBoundary.getUserById.mockReturnValue(activeUser(overrides));
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const protectedHandler = withAuth(handler);

    const response = await protectedHandler(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it.each([
    ['missing company', undefined],
    ['inactive company', activeCompany({ is_active: 0 })],
    ['deleted company', activeCompany({ deleted_at: '2026-07-27T10:00:00.000Z' })],
  ])('rejects access tokens when the user company is %s', async (_state, company) => {
    authBoundary.getCompanyById.mockReturnValue(company);
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const protectedHandler = withAuth(handler);

    const response = await protectedHandler(requestWithBearerToken(), segmentData);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
