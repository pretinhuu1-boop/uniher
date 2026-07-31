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
        blocked INTEGER DEFAULT 0,
        approved INTEGER DEFAULT 1,
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
      INSERT INTO users (id, company_id, department_id, role, name, email) VALUES
        ('rh-a', 'company-a', NULL, 'rh', 'RH A', 'rh@example.com'),
        ('leader-a', 'company-a', 'department-1', 'lideranca', 'Leader A', 'leader@example.com'),
        ('user-1', 'company-a', 'department-1', 'colaboradora', 'Alice', 'alice@example.com'),
        ('user-2', 'company-a', 'department-2', 'colaboradora', 'Beatriz', 'beatriz@example.com');
      INSERT INTO users (id, company_id, department_id, role, name, email, blocked, approved, deleted_at) VALUES
        ('blocked-1', 'company-a', 'department-1', 'colaboradora', 'Blocked', 'blocked@example.com', 1, 1, NULL),
        ('pending-1', 'company-a', 'department-1', 'colaboradora', 'Pending', 'pending@example.com', 0, 0, NULL),
        ('deleted-1', 'company-a', 'department-1', 'colaboradora', 'Deleted', 'deleted@example.com', 0, 1, '2026-07-01');
      INSERT INTO health_events VALUES
        ('event-1', 'user-1', 'company-a', 'Mamografia', 'exame', '2026-07-10', '09:00', 'pending', 'sensitive note', NULL),
        ('event-2', 'user-1', 'company-a', 'Consulta ginecologica', 'consulta', '2026-07-11', '10:00', 'completed', 'private detail', NULL),
        ('event-3', 'user-2', 'company-a', 'Ultrassom', 'exame', '2026-07-12', '11:00', 'pending', 'other team', NULL);
    `);
  });

  function addActiveCollaborators(departmentId: string, count: number) {
    const insert = deps.db.prepare(`
      INSERT INTO users (id, company_id, department_id, role, name, email)
      VALUES (?, 'company-a', ?, 'colaboradora', ?, ?)
    `);
    for (let index = 0; index < count; index += 1) {
      const id = `extra-${departmentId}-${index}`;
      insert.run(id, departmentId, id, `${id}@example.com`);
    }
  }

  it('suppresses every count when the company has fewer than five active collaborators', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07', {
        headers: { 'x-test-role': 'rh' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toEqual({
      events: [],
      stats: { suppressed: true, minimumCohort: 5 },
    });
    for (const secret of [
      'Alice',
      'alice@example.com',
      'Mamografia',
      'sensitive note',
      'user-1',
      '2026-07-10',
      '"total"',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('suppresses a monthly total below the minimum cell size', async () => {
    addActiveCollaborators('department-2', 3);

    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07&type=exame', {
        headers: { 'x-test-role': 'rh' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      events: [],
      stats: { suppressed: true, minimumCohort: 5 },
    });
  });

  it('returns only the monthly total when cohort and metric cell reach the minimum', async () => {
    addActiveCollaborators('department-2', 3);
    deps.db.prepare(`
      INSERT INTO health_events
        (id, user_id, company_id, title, type, date, status)
      VALUES
        ('event-4', 'user-2', 'company-a', 'Private event', 'consulta', '2026-07-13', 'pending'),
        ('event-5', 'user-2', 'company-a', 'Private event', 'exame', '2026-07-14', 'pending')
    `).run();

    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07', {
        headers: { 'x-test-role': 'rh' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      events: [],
      stats: { suppressed: false, minimumCohort: 5, total: 5 },
    });
  });

  it('defaults to the current month instead of exposing an all-time total', async () => {
    addActiveCollaborators('department-2', 3);
    deps.db.prepare(`
      INSERT INTO health_events
        (id, user_id, company_id, title, type, date, status)
      VALUES
        ('event-4', 'user-2', 'company-a', 'Private event', 'consulta', '2026-07-13', 'pending'),
        ('event-5', 'user-2', 'company-a', 'Private event', 'exame', '2026-07-14', 'pending'),
        ('event-august', 'user-1', 'company-a', 'August event', 'exame', '2026-08-01', 'pending')
    `).run();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'));

    try {
      const response = await GET(
        new NextRequest('http://localhost/api/rh/agenda', {
          headers: { 'x-test-role': 'rh' },
        }),
        { params: Promise.resolve({}) },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.stats.total).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the persisted leadership department for both cohort and monthly total', async () => {
    addActiveCollaborators('department-1', 4);

    const response = await GET(
      new NextRequest('http://localhost/api/rh/agenda?month=2026-07', {
        headers: { 'x-test-role': 'lideranca' },
      }),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      events: [],
      stats: { suppressed: true, minimumCohort: 5 },
    });
  });
});
