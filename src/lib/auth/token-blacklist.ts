import { createHash } from 'crypto';
import { getReadDb, getWriteQueue } from '@/lib/db';

/**
 * Blacklist for revoked access tokens.
 *
 * Default remains in-memory for dev/local. Production can set
 * ACCESS_TOKEN_BLACKLIST_BACKEND=sqlite to persist token hashes in the app DB.
 */

type GlobalStore = typeof globalThis & {
  __uniherTokenBlacklist?: Map<string, number>;
  __uniherTokenBlacklistCleanup?: ReturnType<typeof setInterval>;
  __uniherTokenBlacklistSqliteCleanupAt?: number;
};

const g = globalThis as GlobalStore;

if (!g.__uniherTokenBlacklist) {
  g.__uniherTokenBlacklist = new Map<string, number>();
}

const blacklist = g.__uniherTokenBlacklist;

const CLEANUP_INTERVAL = 5 * 60 * 1000;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

if (!g.__uniherTokenBlacklistCleanup) {
  g.__uniherTokenBlacklistCleanup = setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of blacklist) {
      if (expiry < now) blacklist.delete(token);
    }
  }, CLEANUP_INTERVAL);
  g.__uniherTokenBlacklistCleanup.unref();
}

function backend(): string {
  return (process.env.ACCESS_TOKEN_BLACKLIST_BACKEND || 'memory').toLowerCase();
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function expiryFromTtl(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

async function cleanupExpiredSqliteTokens(now = new Date()): Promise<void> {
  const lastCleanup = g.__uniherTokenBlacklistSqliteCleanupAt ?? 0;
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL) return;

  await getWriteQueue().enqueue((db) => {
    db.prepare('DELETE FROM access_token_blacklist WHERE expires_at <= ?')
      .run(now.toISOString());
  }, 'auth.access-token-blacklist.cleanup');
  g.__uniherTokenBlacklistSqliteCleanupAt = Date.now();
}

/**
 * Add a token to the blacklist.
 * @param token - The JWT access token to revoke
 * @param ttlMs - Time to keep in blacklist, defaulting to the JWT access-token expiry.
 */
export async function blacklistToken(token: string, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  if (backend() === 'sqlite') {
    await cleanupExpiredSqliteTokens();
    await getWriteQueue().enqueue((db) => {
      db.prepare(`
        INSERT INTO access_token_blacklist (token_hash, expires_at)
        VALUES (?, ?)
        ON CONFLICT(token_hash) DO UPDATE SET
          expires_at = excluded.expires_at
      `)
        .run(tokenHash(token), expiryFromTtl(ttlMs));
    }, 'auth.access-token-blacklist.insert');
    return;
  }

  blacklist.set(token, Date.now() + ttlMs);
}

/**
 * Check if a token has been revoked.
 */
export function isTokenBlacklisted(token: string): boolean {
  if (backend() === 'sqlite') {
    try {
      const hash = tokenHash(token);
      const row = getReadDb()
        .prepare('SELECT expires_at FROM access_token_blacklist WHERE token_hash = ?')
        .get(hash) as { expires_at: string } | undefined;

      if (!row) return false;
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('[auth] sqlite access token blacklist unavailable; failing closed:', error);
      return true;
    }
  }

  const expiry = blacklist.get(token);
  if (expiry === undefined) return false;
  if (expiry < Date.now()) {
    blacklist.delete(token);
    return false;
  }
  return true;
}
