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

import {
  GET as getActivities,
  POST as postActivity,
} from '@/app/api/collaborator/activities/route';
import { PATCH as patchChallenge } from '@/app/api/collaborator/challenges/[id]/route';

function request(
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function scalar(sql: string): number {
  return (deps.db!.prepare(sql).get() as { value: number }).value;
}

async function incrementChallenge(challengeId = 'challenge-a') {
  return patchChallenge(
    request(`/api/collaborator/challenges/${challengeId}`, 'PATCH', { increment: 1 }),
    { params: Promise.resolve({ id: challengeId }) },
  );
}

describe('collaborator gamification integrity', () => {
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
        level INTEGER DEFAULT 1,
        streak INTEGER DEFAULT 0,
        last_active TEXT,
        daily_xp_earned INTEGER DEFAULT 0,
        daily_xp_date TEXT,
        league TEXT DEFAULT 'bronze',
        updated_at TEXT
      );
      CREATE TABLE challenges (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        category TEXT,
        points INTEGER,
        total_steps INTEGER,
        deadline TEXT,
        archetype_id TEXT,
        company_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE user_challenges (
        user_id TEXT NOT NULL,
        challenge_id TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        PRIMARY KEY (user_id, challenge_id)
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
      CREATE TABLE user_leagues (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        league TEXT,
        week_points INTEGER DEFAULT 0,
        week_start TEXT NOT NULL,
        updated_at TEXT,
        UNIQUE(user_id, week_start)
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
        message TEXT
      );

      INSERT INTO companies (id, name, is_active)
      VALUES
        ('company-a', 'Company A', 1),
        ('company-b', 'Company B', 1);
      INSERT INTO users (
        id, company_id, name, email, role, approved, blocked, points, level
      ) VALUES (
        'user-1', 'company-a', 'User', 'user@example.com',
        'colaboradora', 1, 0, 0, 1
      );
      INSERT INTO challenges (
        id, title, description, category, points, total_steps, company_id
      ) VALUES
        ('challenge-a', 'Own challenge', 'Description', 'health', 100, 1, 'company-a'),
        ('challenge-b', 'Foreign challenge', 'Description', 'health', 100, 1, 'company-b');
      INSERT INTO user_challenges (user_id, challenge_id)
      VALUES
        ('user-1', 'challenge-a'),
        ('user-1', 'challenge-b');
      INSERT INTO activity_log (
        id, user_id, action, target_type, target_id, points_earned
      ) VALUES (
        'activity-existing', 'user-1', 'check_in', 'daily', NULL, 5
      );
    `);
  });

  afterEach(async () => {
    await deps.writeChain.catch(() => undefined);
    deps.db?.close();
    deps.db = null;
  });

  it('keeps activity history readable', async () => {
    const response = await getActivities(
      request('/api/collaborator/activities', 'GET'),
      { params: Promise.resolve({}) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'activity-existing', points_earned: 5 }),
    ]));
  });

  it('rejects client-authored activity points without mutating the balance', async () => {
    const response = await postActivity(
      request('/api/collaborator/activities', 'POST', {
        action: 'client_forged',
        points: 1_000_000_000,
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(0);
    expect(scalar("SELECT COUNT(*) AS value FROM activity_log WHERE action = 'client_forged'")).toBe(0);
  });

  it('credits a concurrent challenge completion exactly once', async () => {
    const responses = await Promise.all([
      incrementChallenge(),
      incrementChallenge(),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(100);
    expect(scalar("SELECT progress AS value FROM user_challenges WHERE challenge_id = 'challenge-a'")).toBe(1);
    expect(scalar("SELECT COUNT(*) AS value FROM activity_log WHERE action = 'earn_points_challenge'")).toBe(1);
  });

  it('keeps an already completed challenge capped and idempotent', async () => {
    const first = await incrementChallenge();
    const second = await incrementChallenge();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(100);
    expect(scalar("SELECT progress AS value FROM user_challenges WHERE challenge_id = 'challenge-a'")).toBe(1);
    expect(scalar("SELECT COUNT(*) AS value FROM activity_log WHERE action = 'earn_points_challenge'")).toBe(1);
  });

  it('fails closed when the actor is revoked before the write', async () => {
    deps.db!.prepare("UPDATE users SET blocked = 1 WHERE id = 'user-1'").run();

    const response = await incrementChallenge();

    expect(response.status).toBe(409);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(0);
    expect(scalar("SELECT progress AS value FROM user_challenges WHERE challenge_id = 'challenge-a'")).toBe(0);
  });

  it('does not progress a challenge from another tenant', async () => {
    const response = await incrementChallenge('challenge-b');

    expect(response.status).toBe(404);
    expect(scalar("SELECT points AS value FROM users WHERE id = 'user-1'")).toBe(0);
    expect(scalar("SELECT progress AS value FROM user_challenges WHERE challenge_id = 'challenge-b'")).toBe(0);
  });
});
