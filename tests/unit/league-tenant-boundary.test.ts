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
import { getLeagueRanking, processLeagueTransitions } from '@/services/league.service';

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
        league TEXT,
        updated_at TEXT
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
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        title TEXT,
        message TEXT
      );
      INSERT INTO users VALUES
        ('user-a', 'company-a', 'Alice', NULL, 'bronze', NULL),
        ('user-b', 'company-b', 'Beatriz', NULL, 'bronze', NULL);
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

  it('promotes the top users independently inside each company', async () => {
    const insertUser = deps.db.prepare(`
      INSERT INTO users (id, company_id, name, avatar_url, league)
      VALUES (?, 'company-a', ?, NULL, 'bronze')
    `);
    const insertEntry = deps.db.prepare(`
      INSERT INTO user_leagues (id, user_id, league, week_points, week_start)
      VALUES (?, ?, 'bronze', ?, '2026-07-27')
    `);

    for (let index = 2; index <= 10; index += 1) {
      const userId = `user-a-${index}`;
      insertUser.run(userId, `Alice ${index}`);
      insertEntry.run(`entry-a-${index}`, userId, 21 - index);
    }

    await processLeagueTransitions('2026-07-27');

    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'user-a'`).get(),
    ).toEqual({ league: 'prata' });
    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'user-b'`).get(),
    ).toEqual({ league: 'prata' });
  });

  it('relegates the bottom users independently inside each company', async () => {
    const insertUser = deps.db.prepare(`
      INSERT INTO users (id, company_id, name, avatar_url, league)
      VALUES (?, ?, ?, NULL, 'prata')
    `);
    const insertEntry = deps.db.prepare(`
      INSERT INTO user_leagues (id, user_id, league, week_points, week_start)
      VALUES (?, ?, 'prata', ?, '2026-07-27')
    `);

    for (const company of ['a', 'b']) {
      for (let rank = 1; rank <= 11; rank += 1) {
        const userId = `prata-${company}-${rank}`;
        const points = company === 'b' ? 200 - rank : 100 - rank;
        insertUser.run(userId, `company-${company}`, `Prata ${company} ${rank}`);
        insertEntry.run(`entry-${userId}`, userId, points);
      }
    }

    await processLeagueTransitions('2026-07-27');

    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'prata-a-1'`).get(),
    ).toEqual({ league: 'ouro' });
    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'prata-a-11'`).get(),
    ).toEqual({ league: 'bronze' });
    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'prata-b-1'`).get(),
    ).toEqual({ league: 'ouro' });
    expect(
      deps.db.prepare(`SELECT league FROM users WHERE id = 'prata-b-11'`).get(),
    ).toEqual({ league: 'bronze' });
  });
});
