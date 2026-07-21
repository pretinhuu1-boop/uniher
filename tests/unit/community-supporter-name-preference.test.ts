import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContext } from '@/lib/auth/middleware';

const SUPPORTER_NAME_KEY = 'privacy_community_supporter_name';
const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  transactionModes: [] as string[],
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => boundary.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!boundary.db) throw new Error('Test database is not configured');
      const guardedDb = new Proxy(boundary.db, {
        get(target, property) {
          if (property === 'transaction') {
            return (callback: () => unknown) => {
              const transaction = target.transaction(callback);
              const guardedTransaction = () => {
                boundary.transactionModes.push('deferred');
                return transaction();
              };
              guardedTransaction.immediate = () => {
                boundary.transactionModes.push('immediate');
                return transaction.immediate();
              };
              return guardedTransaction;
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as Database.Database;
      return operation(guardedDb);
    },
  }),
}));

import { GET as getPreferences, PATCH as patchPreferences } from '@/app/api/users/me/preferences/route';

const ACTOR_ID = 'user-a';
const OTHER_ID = 'user-b';
const ACTOR_EMAIL = 'user-a@example.test';
const REQUEST_IP = '198.51.100.91';

function context(userId = ACTOR_ID): AuthContext {
  return {
    auth: { userId, companyId: 'company-a', role: 'colaboradora' },
    params: Promise.resolve({}),
  };
}

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE user_preferences (
      user_id TEXT NOT NULL,
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(user_id, pref_key)
    );
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      entity_label TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO users (id, email, role) VALUES
      ('user-a', 'user-a@example.test', 'colaboradora'),
      ('user-b', 'user-b@example.test', 'colaboradora');
    INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at) VALUES
      ('user-a', 'privacy_community_supporter_name', '1', '2026-07-21T10:00:00.000Z'),
      ('user-b', 'notif_email', 'daily', '2026-07-21T10:00:00.000Z');
  `);
  return db;
}

async function getFor(userId: string): Promise<Response> {
  return getPreferences(
    new Request('http://localhost/api/users/me/preferences') as unknown as NextRequest,
    context(userId),
  );
}

async function patchFor(
  preferences: Record<string, unknown>,
  userId = ACTOR_ID,
): Promise<Response> {
  return patchPreferences(
    new Request('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `${REQUEST_IP}, 10.0.0.9`,
      },
      body: JSON.stringify({ preferences }),
    }) as unknown as NextRequest,
    context(userId),
  );
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.transactionModes = [];
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('supporter-name preference API', () => {
  it('returns the own persisted value and defaults only the missing own value to zero', async () => {
    expect(await (await getFor(ACTOR_ID)).json()).toEqual({
      preferences: { [SUPPORTER_NAME_KEY]: '1' },
    });
    expect(await (await getFor(OTHER_ID)).json()).toEqual({
      preferences: { notif_email: 'daily', [SUPPORTER_NAME_KEY]: '0' },
    });
  });

  it('accepts only zero or one for the supporter-name key', async () => {
    const response = await patchFor({ [SUPPORTER_NAME_KEY]: '2' });

    expect(response.status).toBe(400);
    expect(boundary.db!.prepare(`
      SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?
    `).pluck().get(ACTOR_ID, SUPPORTER_NAME_KEY)).toBe('1');
    expect(boundary.transactionModes).toEqual([]);
  });

  it('keeps existing key behavior while auditing one real consent change without values', async () => {
    const changed = await patchFor({
      [SUPPORTER_NAME_KEY]: '0',
      notif_email: 'digest',
    });
    expect(changed.status).toBe(200);
    expect(boundary.transactionModes).toEqual(['immediate']);

    const firstUpdatedAt = boundary.db!.prepare(`
      SELECT updated_at FROM user_preferences WHERE user_id = ? AND pref_key = ?
    `).pluck().get(ACTOR_ID, SUPPORTER_NAME_KEY);
    expect(boundary.db!.prepare(`
      SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = 'notif_email'
    `).pluck().get(ACTOR_ID)).toBe('digest');

    const repeated = await patchFor({ [SUPPORTER_NAME_KEY]: '0' });
    expect(repeated.status).toBe(200);
    expect(boundary.transactionModes).toEqual(['immediate', 'immediate']);
    expect(boundary.db!.prepare(`
      SELECT updated_at FROM user_preferences WHERE user_id = ? AND pref_key = ?
    `).pluck().get(ACTOR_ID, SUPPORTER_NAME_KEY)).toBe(firstUpdatedAt);

    const receipts = boundary.db!.prepare(`
      SELECT actor_id, actor_email, actor_role, action, entity_type, entity_id,
             details, ip, created_at
      FROM audit_logs
      WHERE action = 'user_preference_update'
    `).all() as Array<Record<string, string>>;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      actor_id: ACTOR_ID,
      actor_email: ACTOR_EMAIL,
      actor_role: 'colaboradora',
      action: 'user_preference_update',
      entity_type: 'user_preference',
      entity_id: ACTOR_ID,
      ip: REQUEST_IP,
    });
    expect(JSON.parse(receipts[0].details)).toEqual({
      key: SUPPORTER_NAME_KEY,
      timestamp: receipts[0].created_at,
    });
    expect(receipts[0].details).not.toMatch(/previous|new|value|body|content/i);
  });

  it('fails closed when the persisted actor is no longer valid', async () => {
    boundary.db!.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(ACTOR_ID);

    const response = await patchFor({ [SUPPORTER_NAME_KEY]: '0' });
    expect(response.status).toBe(403);
    expect(boundary.db!.prepare(`
      SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?
    `).pluck().get(ACTOR_ID, SUPPORTER_NAME_KEY)).toBe('1');
  });

  it('rolls preference and receipt back together when audit insertion fails', async () => {
    boundary.db!.exec(`
      CREATE TRIGGER reject_supporter_preference_audit
      BEFORE INSERT ON audit_logs
      WHEN NEW.action = 'user_preference_update'
      BEGIN
        SELECT RAISE(ABORT, 'receipt rejected');
      END;
    `);

    const response = await patchFor({ [SUPPORTER_NAME_KEY]: '0' });
    expect(response.status).toBe(500);
    expect(boundary.transactionModes).toEqual(['immediate']);
    expect(boundary.db!.prepare(`
      SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?
    `).pluck().get(ACTOR_ID, SUPPORTER_NAME_KEY)).toBe('1');
    expect(boundary.db!.prepare('SELECT COUNT(*) FROM audit_logs').pluck().get()).toBe(0);
  });
});
