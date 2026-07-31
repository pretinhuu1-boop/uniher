import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  db: null as Database.Database | null,
  writeChain: Promise.resolve() as Promise<unknown>,
  auth: {
    userId: 'user-1',
    companyId: 'company-a',
    role: 'colaboradora',
    isMasterAdmin: false,
  },
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: deps.auth,
  }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: (operation: (db: Database.Database) => unknown) => {
      const task = deps.writeChain.then(() => {
        if (!deps.db) throw new Error('Test database not initialized');
        return operation(deps.db);
      });
      deps.writeChain = task.catch(() => undefined);
      return task;
    },
  }),
}));

vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));

import { POST as joinCampaign } from '@/app/api/campaigns/join/route';

function request(campaignId: string): NextRequest {
  return new NextRequest('http://localhost/api/campaigns/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ campaignId }),
  });
}

function scalar(sql: string): number {
  return (deps.db!.prepare(sql).get() as { value: number }).value;
}

describe('campaign join integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.writeChain = Promise.resolve();
    deps.db = new Database(':memory:');
    deps.db.pragma('foreign_keys = ON');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        name TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        name TEXT,
        email TEXT,
        role TEXT,
        approved INTEGER,
        blocked INTEGER,
        deleted_at TEXT,
        points INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        last_active TEXT,
        updated_at TEXT
      );
      CREATE TABLE badges (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        icon TEXT,
        points INTEGER,
        rarity TEXT
      );
      CREATE TABLE user_badges (
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        PRIMARY KEY (user_id, badge_id)
      );
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT,
        title TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        status TEXT
      );
      CREATE TABLE user_campaigns (
        user_id TEXT NOT NULL,
        campaign_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, campaign_id)
      );
      CREATE TABLE activity_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        points_earned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO companies (id, name, is_active)
      VALUES
        ('company-a', 'Company A', 1),
        ('company-b', 'Company B', 1);
      INSERT INTO users (
        id, company_id, name, email, role, approved, blocked, points, streak
      ) VALUES (
        'user-1', 'company-a', 'User', 'user@example.com',
        'colaboradora', 1, 0, 0, 0
      );
      INSERT INTO campaigns (id, company_id, status)
      VALUES
        ('campaign-a', 'company-a', 'active'),
        ('campaign-inactive', 'company-a', 'next'),
        ('campaign-b', 'company-b', 'active'),
        ('campaign-global', NULL, 'active');
    `);
  });

  afterEach(async () => {
    await deps.writeChain.catch(() => undefined);
    deps.db?.close();
    deps.db = null;
  });

  it('awards the join bonus only once when the request is repeated', async () => {
    const first = await joinCampaign(request('campaign-a'), { params: Promise.resolve({}) });
    const second = await joinCampaign(request('campaign-a'), { params: Promise.resolve({}) });

    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ success: true, pointsEarned: 100 });
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({
      success: true,
      pointsEarned: 0,
      alreadyJoined: true,
    });
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(100);
    expect(scalar("SELECT COUNT(*) AS value FROM user_campaigns WHERE user_id = 'user-1'")).toBe(1);
    expect(scalar("SELECT COUNT(*) AS value FROM activity_log WHERE action = 'join_campaign'")).toBe(1);
  });

  it.each([
    ['a foreign campaign', 'campaign-b'],
    ['an inactive campaign', 'campaign-inactive'],
  ])('does not join or award points for %s', async (_name, campaignId) => {
    const response = await joinCampaign(request(campaignId), { params: Promise.resolve({}) });

    expect(response.status).toBe(404);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(0);
    expect(scalar('SELECT COUNT(*) AS value FROM user_campaigns')).toBe(0);
    expect(scalar('SELECT COUNT(*) AS value FROM activity_log')).toBe(0);
  });

  it('fails closed when the authenticated actor was revoked before the write', async () => {
    deps.db!.prepare("UPDATE users SET blocked = 1 WHERE id = 'user-1'").run();

    const response = await joinCampaign(request('campaign-a'), { params: Promise.resolve({}) });

    expect(response.status).toBe(409);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(0);
    expect(scalar('SELECT COUNT(*) AS value FROM user_campaigns')).toBe(0);
    expect(scalar('SELECT COUNT(*) AS value FROM activity_log')).toBe(0);
  });

  it('allows active global campaigns without crossing tenant boundaries', async () => {
    const response = await joinCampaign(
      request('campaign-global'),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, pointsEarned: 100 });
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(100);
  });
});
