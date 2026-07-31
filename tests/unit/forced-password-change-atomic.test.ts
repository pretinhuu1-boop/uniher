import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const deps = vi.hoisted(() => ({
  db: undefined as unknown as Database.Database,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => operation(deps.db),
  }),
}));

import { completeForcedPasswordChange } from '@/repositories/first-access.repository';

describe('atomic forced password change', () => {
  beforeEach(() => {
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        password_reset_required INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT
      );
      CREATE TABLE refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users (
        id, password_hash, must_change_password, password_reset_required
      ) VALUES ('user-1', 'temporary-hash', 1, 0);
      INSERT INTO refresh_tokens (
        id, user_id, token_hash, expires_at
      ) VALUES ('old-refresh', 'user-1', 'old-hash', datetime('now', '+1 day'));
    `);
  });

  it('updates the password and replaces every refresh token transactionally', async () => {
    await expect(completeForcedPasswordChange({
      userId: 'user-1',
      passwordHash: 'new-password-hash',
      refreshToken: 'new-refresh-token',
    })).resolves.toBe(true);

    expect(deps.db.prepare(`
      SELECT password_hash, must_change_password
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'new-password-hash',
      must_change_password: 0,
    });

    const tokens = deps.db.prepare(`
      SELECT user_id, token_hash
      FROM refresh_tokens WHERE user_id = 'user-1'
    `).all();
    expect(tokens).toEqual([{
      user_id: 'user-1',
      token_hash: createHash('sha256').update('new-refresh-token').digest('hex'),
    }]);
  });

  it('does nothing when the forced-change flag is already clear', async () => {
    deps.db.prepare(
      'UPDATE users SET must_change_password = 0 WHERE id = ?',
    ).run('user-1');

    await expect(completeForcedPasswordChange({
      userId: 'user-1',
      passwordHash: 'attacker-hash',
      refreshToken: 'attacker-refresh',
    })).resolves.toBe(false);

    expect(deps.db.prepare(
      "SELECT password_hash FROM users WHERE id = 'user-1'",
    ).get()).toEqual({ password_hash: 'temporary-hash' });
    expect(deps.db.prepare(
      "SELECT COUNT(*) AS count FROM refresh_tokens WHERE id = 'old-refresh'",
    ).get()).toEqual({ count: 1 });
  });
});
