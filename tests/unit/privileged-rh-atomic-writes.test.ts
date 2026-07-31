import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  db: null as Database.Database | null,
  writeChain: Promise.resolve() as Promise<unknown>,
  logAudit: vi.fn(),
}));

function authContext() {
  return {
    userId: 'rh-1',
    companyId: 'company-a',
    role: 'rh',
    isMasterAdmin: false,
  };
}

vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: authContext(),
  }),
  withAuth: (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => {
    const isSelfRedeem = req.nextUrl.pathname.endsWith('/redeem');
    return handler(req, {
      params: segment.params ?? Promise.resolve({}),
      auth: isSelfRedeem
        ? {
            userId: 'user-1',
            companyId: 'company-a',
            role: 'colaboradora',
            isMasterAdmin: false,
          }
        : authContext(),
    });
  },
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
vi.mock('@/lib/audit', () => ({ logAudit: deps.logAudit }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkInviteAcceptRateLimit: vi.fn(),
}));
vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn(async () => 'hashed-password'),
}));
vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: vi.fn(async () => 'access-token'),
  signRefreshToken: vi.fn(async () => 'refresh-token'),
}));
vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: (response: Response) => response,
}));

import { POST as createObjective } from '@/app/api/rh/objectives/route';
import { PATCH as updateObjective } from '@/app/api/rh/objectives/[id]/route';
import {
  PATCH as processRedemption,
} from '@/app/api/gamification/rewards/redemptions/route';
import { POST as redeemReward } from '@/app/api/gamification/rewards/redeem/route';
import { DELETE as revokeInvite } from '@/app/api/invites/[token]/route';

function request(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('privileged RH atomic writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.writeChain = Promise.resolve();
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        company_id TEXT,
        role TEXT,
        approved INTEGER,
        blocked INTEGER,
        deleted_at TEXT,
        points INTEGER DEFAULT 0,
        updated_at TEXT
      );
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT
      );
      CREATE TABLE badges (
        id TEXT PRIMARY KEY,
        name TEXT
      );
      CREATE TABLE company_objectives (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        title TEXT,
        description TEXT,
        type TEXT,
        target_type TEXT,
        target_value INTEGER,
        campaign_id TEXT,
        reward_type TEXT,
        reward_points INTEGER,
        reward_badge_id TEXT,
        reward_custom TEXT,
        starts_at TEXT,
        ends_at TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE rewards (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        title TEXT,
        points_cost INTEGER,
        quantity_available INTEGER,
        active INTEGER DEFAULT 1
      );
      CREATE TABLE reward_redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        reward_id TEXT,
        points_spent INTEGER,
        status TEXT,
        approved_by TEXT,
        approved_at TEXT
      );
      CREATE TABLE activity_log (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT,
        target_type TEXT,
        target_id TEXT,
        points_earned INTEGER
      );
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        title TEXT,
        message TEXT
      );
      CREATE TABLE invites (
        token TEXT PRIMARY KEY,
        company_id TEXT,
        status TEXT
      );

      INSERT INTO companies (id, name, is_active)
      VALUES
        ('company-a', 'Company A', 1),
        ('company-b', 'Company B', 1);
      INSERT INTO users (
        id, name, email, company_id, role, approved, blocked, points
      ) VALUES
        ('rh-1', 'Revoked RH', 'rh@example.com', 'company-a', 'rh', 1, 1, 0),
        ('user-1', 'User', 'user@example.com', 'company-a', 'colaboradora', 1, 0, 50);
      INSERT INTO campaigns (id, company_id, name)
      VALUES
        ('11111111-1111-4111-8111-111111111111', 'company-a', 'Own Campaign'),
        ('22222222-2222-4222-8222-222222222222', 'company-b', 'Foreign Campaign');
      INSERT INTO company_objectives (
        id, company_id, title, type, target_type, target_value,
        reward_type, reward_points, created_by
      ) VALUES (
        'objective-a', 'company-a', 'Original objective', 'goal',
        'points', 10, 'points', 5, 'rh-1'
      );
      INSERT INTO rewards (id, company_id, title, quantity_available)
      VALUES ('reward-a', 'company-a', 'Reward A', 3);
      INSERT INTO reward_redemptions (
        id, user_id, reward_id, points_spent, status
      ) VALUES ('redemption-a', 'user-1', 'reward-a', 20, 'pending');
      INSERT INTO invites (token, company_id, status)
      VALUES
        ('pending-token', 'company-a', 'pending'),
        ('accepted-token', 'company-a', 'accepted');
    `);
  });

  afterEach(async () => {
    await deps.writeChain.catch(() => undefined);
    deps.db?.close();
    deps.db = null;
  });

  it('does not update an objective after the RH actor is revoked', async () => {
    const response = await updateObjective(
      request('/api/rh/objectives/objective-a', 'PATCH', {
        title: 'Changed objective',
      }),
      { params: Promise.resolve({ id: 'objective-a' }) },
    );
    await deps.writeChain;
    const objective = deps.db!.prepare(
      'SELECT title FROM company_objectives WHERE id = ?',
    ).get('objective-a') as { title: string };

    expect(response.status).toBe(409);
    expect(objective.title).toBe('Original objective');
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not create an objective for a campaign from another company', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    const response = await createObjective(
      request('/api/rh/objectives', 'POST', {
        title: 'Foreign campaign objective',
        type: 'campaign',
        target_type: 'campaign_complete',
        target_value: 1,
        campaign_id: '22222222-2222-4222-8222-222222222222',
        reward_type: 'points',
        reward_points: 10,
      }),
      { params: Promise.resolve({}) },
    );
    const created = deps.db!.prepare(
      'SELECT id FROM company_objectives WHERE campaign_id = ?',
    ).get('22222222-2222-4222-8222-222222222222');

    expect(response.status).toBe(409);
    expect(created).toBeUndefined();
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('processes a concurrent rejected redemption only once', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    const first = processRedemption(
      request('/api/gamification/rewards/redemptions', 'PATCH', {
        redemptionId: 'redemption-a',
        status: 'rejected',
      }),
      { params: Promise.resolve({}) },
    );
    const second = processRedemption(
      request('/api/gamification/rewards/redemptions', 'PATCH', {
        redemptionId: 'redemption-a',
        status: 'rejected',
      }),
      { params: Promise.resolve({}) },
    );
    const responses = await Promise.all([first, second]);
    const user = deps.db!.prepare('SELECT points FROM users WHERE id = ?')
      .get('user-1') as { points: number };
    const logs = deps.db!.prepare(
      "SELECT COUNT(*) AS count FROM activity_log WHERE action = 'refund_reward'",
    ).get() as { count: number };

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(user.points).toBe(70);
    expect(logs.count).toBe(1);
  });

  it('redeems limited points and stock only once under concurrency', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0, points = 30 WHERE id = ?')
      .run('user-1');
    deps.db!.prepare(`
      UPDATE rewards
      SET points_cost = 20, quantity_available = 1
      WHERE id = 'reward-a'
    `).run();
    const first = redeemReward(
      request('/api/gamification/rewards/redeem', 'POST', {
        rewardId: 'reward-a',
      }),
      { params: Promise.resolve({}) },
    );
    const second = redeemReward(
      request('/api/gamification/rewards/redeem', 'POST', {
        rewardId: 'reward-a',
      }),
      { params: Promise.resolve({}) },
    );
    const responses = await Promise.all([first, second]);
    const user = deps.db!.prepare('SELECT points FROM users WHERE id = ?')
      .get('user-1') as { points: number };
    const reward = deps.db!.prepare(
      'SELECT quantity_available FROM rewards WHERE id = ?',
    ).get('reward-a') as { quantity_available: number };
    const redemptions = deps.db!.prepare(
      'SELECT COUNT(*) AS count FROM reward_redemptions',
    ).get() as { count: number };

    expect(responses.map((response) => response.status).sort()).toEqual([201, 422]);
    expect(user.points).toBe(10);
    expect(reward.quantity_available).toBe(0);
    expect(redemptions.count).toBe(2);
  });

  it('does not process a redemption after the RH actor is revoked', async () => {
    const response = await processRedemption(
      request('/api/gamification/rewards/redemptions', 'PATCH', {
        redemptionId: 'redemption-a',
        status: 'approved',
      }),
      { params: Promise.resolve({}) },
    );
    const redemption = deps.db!.prepare(
      'SELECT status FROM reward_redemptions WHERE id = ?',
    ).get('redemption-a') as { status: string };

    expect(response.status).toBe(409);
    expect(redemption.status).toBe('pending');
  });

  it('does not revoke an invite after the RH actor is revoked', async () => {
    const response = await revokeInvite(
      request('/api/invites/pending-token', 'DELETE'),
      { params: Promise.resolve({ token: 'pending-token' }) },
    );
    const invite = deps.db!.prepare('SELECT status FROM invites WHERE token = ?')
      .get('pending-token') as { status: string };

    expect(response.status).toBe(409);
    expect(invite.status).toBe('pending');
  });

  it('never rewrites an accepted invite as expired', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    const response = await revokeInvite(
      request('/api/invites/accepted-token', 'DELETE'),
      { params: Promise.resolve({ token: 'accepted-token' }) },
    );
    const invite = deps.db!.prepare('SELECT status FROM invites WHERE token = ?')
      .get('accepted-token') as { status: string };

    expect(response.status).toBe(409);
    expect(invite.status).toBe('accepted');
  });
});
