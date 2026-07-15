import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DashboardHttpError,
  dashboardFetcher,
} from '@/hooks/useDashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dashboardFetcher', () => {
  it('returns JSON for a successful dashboard response', async () => {
    const body = { kpis: [], departments: [], campaigns: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(dashboardFetcher('/api/dashboard')).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard');
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
