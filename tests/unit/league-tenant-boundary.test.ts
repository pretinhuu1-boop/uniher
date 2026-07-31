import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({ db: null as any }));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest, segment: any) =>
    handler(req, {
      params: segment.params,
      auth: {
        userId: 'user-a',
        companyId: 'company-a',
        role: 'colaboradora',
      },
    }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (operation: any) => operation(deps.db),
  }),
}));

import {
  POST as joinLeague,
  DELETE as leaveLeague,
} from '@/app/api/rh/leagues/[id]/join/route';
import { getLeagueRanking } from '@/services/league.service';

describe('league tenant boundary', () => {
  beforeEach(() => {
    deps.db?.close();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT,
        avatar_url TEXT,
        league TEXT
      );
      CREATE TABLE custom_leagues (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        type TEXT,
        is_active INTEGER
      );
      CREATE TABLE custom_league_members (
        id TEXT PRIMARY KEY,
        league_id TEXT,
        user_id TEXT,
        week_points INTEGER,
        week_start TEXT,
        UNIQUE(league_id, user_id)
      );
      CREATE TABLE user_leagues (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        league TEXT,
        week_points INTEGER,
        week_start TEXT
      );
      INSERT INTO users VALUES
        ('user-a', 'company-a', 'Alice', NULL, 'bronze'),
        ('user-b', 'company-b', 'Beatriz', NULL, 'bronze');
      INSERT INTO custom_leagues VALUES
        ('league-b', 'company-b', 'opt_in', 1);
      INSERT INTO user_leagues VALUES
        ('entry-a', 'user-a', 'bronze', 10, '2026-07-27'),
        ('entry-b', 'user-b', 'bronze', 20, '2026-07-27');
    `);
  });

  it('does not allow joining a custom league from another company', async () => {
    const response = await joinLeague(
      new NextRequest('http://localhost/api/rh/leagues/league-b/join', { method: 'POST' }),
      { params: Promise.resolve({ id: 'league-b' }) },
    );
    const members = deps.db.prepare('SELECT COUNT(*) AS count FROM custom_league_members')
      .get() as { count: number };

    expect(response.status).toBe(404);
    expect(members.count).toBe(0);
  });

  it('does not allow leaving a custom league from another company', async () => {
    deps.db.prepare(`
      INSERT INTO custom_league_members
        (id, league_id, user_id, week_points, week_start)
      VALUES ('member-a', 'league-b', 'user-a', 0, '2026-07-27')
    `).run();

    const response = await leaveLeague(
      new NextRequest('http://localhost/api/rh/leagues/league-b/join', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'league-b' }) },
    );

    expect(response.status).toBe(404);
    expect(
      deps.db.prepare('SELECT COUNT(*) AS count FROM custom_league_members')
        .get(),
    ).toEqual({ count: 1 });
  });

  it('scopes standard league ranking to the authenticated company', () => {
    const ranking = (getLeagueRanking as any)('bronze', '2026-07-27', 'company-a');

    expect(ranking.map((entry: any) => entry.name)).toEqual(['Alice']);
  });
});
