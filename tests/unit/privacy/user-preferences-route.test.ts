import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
  enqueueCalls: 0,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock('@/lib/db/init', () => ({
  initDb: async () => undefined,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!runtime.db) throw new Error('test database is not initialized');
    return runtime.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      runtime.enqueueCalls += 1;
      if (!runtime.db) throw new Error('test database is not initialized');
      return operation(runtime.db);
    },
  }),
}));

import { PATCH } from '@/app/api/users/me/preferences/route';

const auth = {
  userId: 'user-1',
  companyId: 'company-1',
  role: 'colaboradora',
  email: 'user@example.test',
};

type PatchHandler = (
  request: Request,
  context: { auth: typeof auth },
) => Promise<Response>;

const patchPreferences = PATCH as unknown as PatchHandler;

function request(preferences: unknown) {
  return new Request('http://localhost/api/users/me/preferences', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ preferences }),
  });
}

function preferences() {
  return runtime.db!.prepare(`
    SELECT pref_key, pref_value
    FROM user_preferences
    WHERE user_id = ?
    ORDER BY pref_key
  `).all(auth.userId);
}

describe('PATCH /api/users/me/preferences', () => {
  beforeEach(() => {
    runtime.db = new Database(':memory:');
    runtime.db.exec(`
      CREATE TABLE user_preferences (
        user_id TEXT NOT NULL,
        pref_key TEXT NOT NULL,
        pref_value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, pref_key)
      );
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES ('user-1', 'notif_email', 'preserve-me', datetime('now'));
    `);
    runtime.enqueueCalls = 0;
  });

  afterEach(() => {
    runtime.db?.close();
    runtime.db = null;
  });

  it('persists a sparse single-key update without changing another preference', async () => {
    const response = await patchPreferences(
      request({ first_access_tour_completed: '1' }),
      { auth },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(runtime.enqueueCalls).toBe(1);
    expect(preferences()).toEqual([
      { pref_key: 'first_access_tour_completed', pref_value: '1' },
      { pref_key: 'notif_email', pref_value: 'preserve-me' },
    ]);
  });

  it('accepts an empty patch without opening the write queue', async () => {
    const before = preferences();

    const response = await patchPreferences(request({}), { auth });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(runtime.enqueueCalls).toBe(0);
    expect(preferences()).toEqual(before);
  });

  it.each([
    ['an unknown key', { unknown_preference: '1' }],
    ['a non-string value', { notif_email: true }],
  ])('rejects %s before writing', async (_label, payload) => {
    const before = preferences();

    const response = await patchPreferences(request(payload), { auth });

    expect(response.status).toBe(400);
    expect(runtime.enqueueCalls).toBe(0);
    expect(preferences()).toEqual(before);
  });

  it('returns the privacy-review response for privacy_ranking before writing', async () => {
    const before = preferences();

    const response = await patchPreferences(request({ privacy_ranking: '1' }), { auth });

    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({
      status: 'unavailable',
      reason: 'privacy_review',
    });
    expect(runtime.enqueueCalls).toBe(0);
    expect(preferences()).toEqual(before);
  });

  it('rejects a mixed privacy_ranking patch atomically', async () => {
    const before = preferences();

    const response = await patchPreferences(request({
      first_access_tour_completed: '1',
      privacy_ranking: '0',
    }), { auth });

    expect(response.status).toBe(410);
    expect(runtime.enqueueCalls).toBe(0);
    expect(preferences()).toEqual(before);
  });
});
