import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let db: Database.Database;

async function loadTokenBlacklist() {
  vi.resetModules();
  vi.doMock('@/lib/db', () => ({
    getReadDb: () => db,
    getWriteQueue: () => ({
      enqueue: async (callback: (database: Database.Database) => unknown) => callback(db),
    }),
  }));
  return import('@/lib/auth/token-blacklist');
}

describe('auth token blacklist', () => {
  beforeEach(() => {
    process.env.ACCESS_TOKEN_BLACKLIST_BACKEND = 'sqlite';
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE access_token_blacklist (
        token_hash TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL,
        created_at TEXT
      );
    `);
  });

  afterEach(() => {
    delete process.env.ACCESS_TOKEN_BLACKLIST_BACKEND;
    db.close();
    vi.doUnmock('@/lib/db');
    vi.resetModules();
  });

  it('persists revoked access token hashes with sqlite backend', async () => {
    const { blacklistToken, isTokenBlacklisted } = await loadTokenBlacklist();

    await blacklistToken('plain-access-token', 60_000);

    const row = db.prepare('SELECT token_hash, expires_at FROM access_token_blacklist').get() as {
      token_hash: string;
      expires_at: string;
    };
    expect(row.token_hash).not.toBe('plain-access-token');
    expect(row.token_hash).toHaveLength(64);
    expect(new Date(row.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(isTokenBlacklisted('plain-access-token')).toBe(true);
  });

  it('expires sqlite blacklist entries and removes stale hashes', async () => {
    const { blacklistToken, isTokenBlacklisted } = await loadTokenBlacklist();

    await blacklistToken('expired-access-token', -1);

    expect(isTokenBlacklisted('expired-access-token')).toBe(false);
    const row = db.prepare('SELECT token_hash FROM access_token_blacklist').get() as { token_hash: string } | undefined;
    expect(row?.token_hash).toHaveLength(64);
  });
});
