import { describe, expect, it, vi } from 'vitest';

const dbBoundary = vi.hoisted(() => ({
  getReadDb: vi.fn(() => ({
    prepare: () => ({
      get: () => ({ count: 42 }),
    }),
  })),
  getStats: vi.fn(() => ({ pending: 7, failed: 1 })),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkPublicRateLimit: async () => undefined,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: dbBoundary.getReadDb,
  getWriteQueue: () => ({
    getStats: dbBoundary.getStats,
  }),
}));

import { GET } from '@/app/api/health/route';

describe('public health liveness boundary', () => {
  it('keeps /api/health useful without exposing operational diagnostics', async () => {
    const response = await GET(new Request('http://localhost/api/health') as never);

    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;

    expect(body).toMatchObject({ status: 'healthy' });
    expect(typeof body.timestamp).toBe('string');
    expect(Object.keys(body).sort()).toEqual(['status', 'timestamp']);

    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/db|database|memory|heap|rss|uptime|users|companies|queue|pending|failed|size|version|path/i);
    expect(dbBoundary.getReadDb).not.toHaveBeenCalled();
    expect(dbBoundary.getStats).not.toHaveBeenCalled();
  });
});
