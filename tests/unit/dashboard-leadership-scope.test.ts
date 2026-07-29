import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => {
  const { z } = require('zod') as typeof import('zod');

  return {
    db: null as Database.Database | null,
    projectionCalls: [] as Array<Record<string, unknown>>,
    dashboardQuerySchema: z.object({
      period: z.enum(['1m', '3m', '6m', '1a']).default('1m'),
      departmentId: z.string().trim().min(1).max(128).optional(),
      companyId: z.string().trim().min(1).max(128).optional(),
    }).strict(),
  };
});

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withRole: () => expose };
});

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('database not configured');
    return boundary.db;
  },
}));

vi.mock('@/services/dashboard.service', () => ({
  dashboardQuerySchema: boundary.dashboardQuerySchema,
  getProtectedDashboardProjection: (input: Record<string, unknown>) => {
    boundary.projectionCalls.push(input);
    return { ok: true, input };
  },
}));

import { GET as getDashboard } from '@/app/api/dashboard/route';

function context(userId: string, role: string, companyId = 'company-a') {
  return {
    auth: { userId, role, companyId },
    params: Promise.resolve({}),
  };
}

function nextRequest(url: string) {
  const request = new Request(url) as Request & { nextUrl: URL };
  request.nextUrl = new URL(url);
  return request;
}

function createDatabase() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      department_id TEXT,
      role TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      deleted_at TEXT
    );

    INSERT INTO users (id, company_id, department_id, role, blocked, approved, deleted_at) VALUES
      ('leader-a', 'company-a', 'dept-a', 'lideranca', 0, 1, NULL),
      ('leader-no-dept', 'company-a', NULL, 'lideranca', 0, 1, NULL),
      ('rh-a', 'company-a', NULL, 'rh', 0, 1, NULL);
  `);
  return db;
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.projectionCalls = [];
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('leadership dashboard scope', () => {
  it('forces the persisted leadership department over query params', async () => {
    const response = await getDashboard(
      nextRequest('http://localhost/api/dashboard?period=3m&departmentId=dept-b') as any,
      context('leader-a', 'lideranca') as any,
    );

    expect(response.status).toBe(200);
    expect(boundary.projectionCalls).toEqual([
      expect.objectContaining({
        companyId: 'company-a',
        period: '3m',
        departmentId: 'dept-a',
      }),
    ]);
  });

  it('blocks leadership dashboard when the leader has no department', async () => {
    const response = await getDashboard(
      nextRequest('http://localhost/api/dashboard?period=1m') as any,
      context('leader-no-dept', 'lideranca') as any,
    );

    expect(response.status).toBe(403);
    expect(boundary.projectionCalls).toEqual([]);
  });

  it('keeps RH dashboard department filters client-selected', async () => {
    const response = await getDashboard(
      nextRequest('http://localhost/api/dashboard?period=1m&departmentId=dept-b') as any,
      context('rh-a', 'rh') as any,
    );

    expect(response.status).toBe(200);
    expect(boundary.projectionCalls).toEqual([
      expect.objectContaining({
        companyId: 'company-a',
        period: '1m',
        departmentId: 'dept-b',
      }),
    ]);
  });
});
