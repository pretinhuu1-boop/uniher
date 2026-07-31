import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const healthDeps = vi.hoisted(() => ({
  checkPublicRateLimit: vi.fn(),
  getReadDb: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkPublicRateLimit: healthDeps.checkPublicRateLimit,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: healthDeps.getReadDb,
  getWriteQueue: vi.fn(),
}));

import { GET } from '@/app/api/health/route';

function healthRequest() {
  return new NextRequest('http://localhost/api/health');
}

describe('public health endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthDeps.checkPublicRateLimit.mockResolvedValue(undefined);
    healthDeps.getReadDb.mockReturnValue({
      prepare: vi.fn(() => ({
        get: vi.fn(() => ({ ok: 1 })),
      })),
    });
  });

  it('returns only a minimal healthy signal without infrastructure or tenant data', async () => {
    const response = await GET(healthRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'healthy' });
    expect(body).not.toHaveProperty('db');
    expect(body).not.toHaveProperty('memory');
    expect(body).not.toHaveProperty('uptime');
    expect(body).not.toHaveProperty('version');
  });

  it('returns only a minimal degraded signal when the database check fails', async () => {
    healthDeps.getReadDb.mockImplementation(() => {
      throw new Error('database unavailable');
    });

    const response = await GET(healthRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'degraded' });
  });
});
