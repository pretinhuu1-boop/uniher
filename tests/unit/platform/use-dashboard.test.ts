import { afterEach, describe, expect, it, vi } from 'vitest';
import { mutate, unstable_serialize } from 'swr';
import { cache } from 'swr/_internal';
import {
  DashboardHttpError,
  buildDashboardEndpoint,
  dashboardFetcher,
} from '@/hooks/useDashboard';
import {
  clearProtectedReportCaches,
  getAuthenticatedScope,
  isProtectedReportCacheKey,
  shouldClearProtectedReportCaches,
} from '@/hooks/useAuth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dashboardFetcher', () => {
  it('builds an explicit selected-company endpoint for Admin Master reports', () => {
    expect(buildDashboardEndpoint('3m', 'dept-a', 'company-a')).toBe(
      '/api/dashboard?period=3m&departmentId=dept-a&companyId=company-a',
    );
    expect(buildDashboardEndpoint('1m')).toBe('/api/dashboard?period=1m');
  });

  it('returns JSON for a successful dashboard response', async () => {
    const body = { kpis: [], departments: [], campaigns: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(dashboardFetcher('/api/dashboard')).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard', { cache: 'no-store' });
  });

  it('throws a useful typed error for an unauthorized response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'Sessão expirada' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    )));

    await expect(dashboardFetcher('/api/dashboard')).rejects.toEqual(
      new DashboardHttpError(401, 'Sessão expirada'),
    );
  });

  it('throws a useful typed error for a server failure without JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Internal error', { status: 500 })));

    await expect(dashboardFetcher('/api/dashboard')).rejects.toMatchObject({
      status: 500,
      message: 'Falha ao carregar dashboard (500).',
    });
  });
});

describe('protected report SWR cache matcher', () => {
  it('invalidates only when the authenticated privacy scope changes or ends', () => {
    const companyARh = getAuthenticatedScope({
      id: 'user-a',
      companyId: 'company-a',
      role: 'rh',
    });

    expect(shouldClearProtectedReportCaches(undefined, companyARh)).toBe(true);
    expect(shouldClearProtectedReportCaches(companyARh, companyARh)).toBe(false);
    expect(shouldClearProtectedReportCaches(companyARh, getAuthenticatedScope({
      id: 'user-b',
      companyId: 'company-b',
      role: 'rh',
    }))).toBe(true);
    expect(shouldClearProtectedReportCaches(companyARh, getAuthenticatedScope({
      id: 'user-a',
      companyId: 'company-a',
      role: 'colaboradora',
    }))).toBe(true);
    expect(shouldClearProtectedReportCaches(companyARh, null)).toBe(true);
    expect(shouldClearProtectedReportCaches(null, null)).toBe(false);
  });

  it('matches only exact protected endpoints in scoped array keys', () => {
    expect(isProtectedReportCacheKey([
      'protected-report',
      '/api/dashboard?period=1m',
      'company-a',
      'rh',
      '1m',
      'all',
    ])).toBe(true);
    expect(isProtectedReportCacheKey([
      'protected-report',
      '/api/analytics/history?period=6',
      'company-a',
      'rh',
    ])).toBe(true);
    expect(isProtectedReportCacheKey([
      'protected-report',
      '/api/dashboard-legacy?period=1m',
      'company-a',
      'rh',
    ])).toBe(false);
    expect(isProtectedReportCacheKey(['other-cache', '/api/dashboard'])).toBe(false);
    expect(isProtectedReportCacheKey('/api/dashboard')).toBe(false);
  });

  it('removes protected data from the real SWR cache without revalidation', async () => {
    const key = [
      'protected-report',
      '/api/dashboard?period=1m',
      'company-a',
      'rh',
      '1m',
      'all',
    ] as const;
    const serializedKey = unstable_serialize(key);
    await mutate(key, { secret: 86421 }, { revalidate: false });
    const cacheEntry = {
      ...cache.get(serializedKey),
      _k: key,
      data: { secret: 86421 },
    };
    cache.set(serializedKey, cacheEntry);
    expect(cache.get(serializedKey)?.data).toEqual({ secret: 86421 });

    await clearProtectedReportCaches();

    expect(cache.get(serializedKey)?.data).toBeUndefined();
  });
});
