import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as any }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (..._roles: string[]) => (handler: any) =>
    (req: NextRequest, segment: any) => {
      const role = req.headers.get('x-test-role') ?? 'rh';
      return handler(req, {
        params: segment.params,
        auth: {
          userId: role === 'lideranca' ? 'leader-a' : 'rh-a',
          companyId: 'company-a',
          role,
        },
      });
    },
}));

vi.mock('@/lib/db', () => ({ getReadDb: () => deps.db }));
vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));

import { GET } from '@/app/api/rh/agenda/route';

describe('health agenda privacy', () => {
  beforeEach(() => {
    deps.db?.close();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        role TEXT,
        name TEXT,
        email TEXT,
        deleted_at TEXT
      );
      CREATE TABLE health_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        company_id TEXT,
        title TEXT,
        type TEXT,
        date TEXT,
        time TEXT,
        status TEXT,
        notes TEXT,
        deleted_at TEXT
      );
      INSERT INTO users VALUES
        ('rh-a', 'company-a', NULL, 'rh', 'RH A', 'rh@example.com', NULL),
        ('leader-a', 'company-a', 'department-1', 'lideranca', 'Leader A', 'leader@example.com', NULL),
        ('user-1', 'company-a', 'department-1', 'colaboradora', 'Alice', 'alice@example.com', NULL),
        ('user-2', 'company-a', 'department-2', 'colaboradora', 'Beatriz', 'beatriz@example.com', NULL);
      INSERT INTO health_events VALUES
        ('event-1', 'user-1', 'company-a', 'Mamografia', 'exame', '2026-07-10', '09:00', 'pending', 'sensitive note', NULL),
        ('event-2', 'user-1', 'company-a', 'Consulta ginecologica', 'consulta', '2026-07-11', '10:00', 'completed', 'private detail', NULL),
        ('event-3', 'user-2', 'company-a', 'Ultrassom', 'exame', '2026-07-12', '11:00', 'pending', 'other team', NULL);
    `);
  });

  it('returns aggregate events to RH without identity or clinical detail', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07', {
        headers: { 'x-test-role': 'rh' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ date: '2026-07-10', type: 'exame', status: 'pending', count: 1 }),
    ]));
    for (const secret of [
      'Alice',
      'alice@example.com',
      'Mamografia',
      'sensitive note',
      'user-1',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('scopes leadership aggregates to the persisted department', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07', {
        headers: { 'x-test-role': 'lideranca' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(body.stats.total).toBe(2);
    expect(body.events).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain('other team');
  });
});
