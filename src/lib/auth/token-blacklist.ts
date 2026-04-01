/**
 * In-memory blacklist for revoked access tokens.
 * Tokens are auto-removed after their natural expiry (15 min).
 *
 * Uses globalThis so the same Map instance survives Next.js hot-module
 * reloads in dev mode (otherwise each route bundle gets its own copy
 * and the blacklist written by /logout is invisible to /auth/me).
 *
 * In production with multiple instances, replace with Redis.
 */

type GlobalStore = typeof globalThis & {
  __uniherTokenBlacklist?: Map<string, number>;
  __uniherTokenBlacklistCleanup?: ReturnType<typeof setInterval>;
};

const g = globalThis as GlobalStore;

if (!g.__uniherTokenBlacklist) {
  g.__uniherTokenBlacklist = new Map<string, number>();
}

const blacklist = g.__uniherTokenBlacklist;

const CLEANUP_INTERVAL = 5 * 60 * 1000; // cleanup every 5 min

// Periodic cleanup — create only once per process lifetime
if (!g.__uniherTokenBlacklistCleanup) {
  g.__uniherTokenBlacklistCleanup = setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of blacklist) {
      if (expiry < now) blacklist.delete(token);
    }
  }, CLEANUP_INTERVAL);
  g.__uniherTokenBlacklistCleanup.unref();
}

/**
 * Add a token to the blacklist.
 * @param token - The JWT access token to revoke
 * @param ttlMs - Time to keep in blacklist (default: 15 min, matching JWT expiry)
 */
export function blacklistToken(token: string, ttlMs = 15 * 60 * 1000): void {
  blacklist.set(token, Date.now() + ttlMs);
}

/**
 * Check if a token has been revoked.
 */
export function isTokenBlacklisted(token: string): boolean {
  const expiry = blacklist.get(token);
  if (expiry === undefined) return false;
  if (expiry < Date.now()) {
    blacklist.delete(token);
    return false;
  }
  return true;
}
