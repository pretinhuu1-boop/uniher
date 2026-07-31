import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  db: undefined as unknown as Database.Database,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (
      operation: (db: Database.Database) => unknown,
      _label?: string,
      _options?: unknown,
    ) => operation(deps.db),
  }),
}));

import { signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt';
import {
  cleanExpiredTokens,
  findValidToken,
  rotateRefreshToken,
} from '@/repositories/refresh-token.repository';

describe('refresh token security', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_REFRESH_SECRET', 'r'.repeat(48));
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  });

  afterEach(() => {
    deps.db.close();
    vi.unstubAllEnvs();
  });

  it('issues distinct refresh JWTs even within the same second', async () => {
    const first = await signRefreshToken({ userId: 'user-1' });
    const second = await signRefreshToken({ userId: 'user-1' });

    expect(second).not.toBe(first);
    const [firstPayload, secondPayload] = await Promise.all([
      verifyRefreshToken(first),
      verifyRefreshToken(second),
    ]);
    expect(firstPayload.jti).toBeTruthy();
    expect(secondPayload.jti).toBeTruthy();
    expect(secondPayload.jti).not.toBe(firstPayload.jti);
  });

  it('atomically consumes a refresh token and rejects replay', async () => {
    const { createHash } = await import('crypto');
    const current = 'current-refresh-token';
    deps.db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES ('old', 'user-1', ?, datetime('now', '+1 day'))
    `).run(createHash('sha256').update(current).digest('hex'));

    await expect(rotateRefreshToken(
      'user-1',
      current,
      'replacement-refresh-token',
    )).resolves.toMatchObject({ user_id: 'user-1' });

    await expect(rotateRefreshToken(
      'user-1',
      current,
      'attacker-replay-replacement',
    )).resolves.toBeNull();
    expect(deps.db.prepare(
      "SELECT COUNT(*) AS count FROM refresh_tokens WHERE user_id = 'user-1'",
    ).get()).toEqual({ count: 1 });
  });

  it('finds valid tokens and deletes expired tokens on strict SQLite builds', async () => {
    const { createHash } = await import('crypto');
    const valid = 'valid-refresh-token';
    deps.db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES
        ('valid', 'user-1', ?, datetime('now', '+1 day')),
        ('expired', 'user-1', 'expired-hash', datetime('now', '-1 day'))
    `).run(createHash('sha256').update(valid).digest('hex'));

    expect(findValidToken(valid)).toMatchObject({ id: 'valid', user_id: 'user-1' });
    await cleanExpiredTokens();
    expect(deps.db.prepare(
      'SELECT id FROM refresh_tokens ORDER BY id',
    ).all()).toEqual([{ id: 'valid' }]);
  });
});
