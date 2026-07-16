import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const authBoundary = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
  isTokenBlacklisted: vi.fn(),
  verifyAccessToken: vi.fn(),
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

import { withAuth, withRole } from '@/lib/auth/middleware';

const segmentData = { params: Promise.resolve({}) };

function requestWithBearerToken() {
  return new NextRequest('http://localhost/api/protected', {
    headers: { Authorization: 'Bearer valid-token' },
  });
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
});
