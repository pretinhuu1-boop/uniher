import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function findByTokenHash(tokenHash: string): RefreshTokenRow | undefined {
  const db = getReadDb();
  return db.prepare(
    "SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime('now')"
  ).get(tokenHash) as RefreshTokenRow | undefined;
}

export function findValidToken(token: string): RefreshTokenRow | undefined {
  return findByTokenHash(hashToken(token));
}

export async function createRefreshToken(userId: string, token: string, expiresInDays = 2): Promise<RefreshTokenRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();
  const tokenHash = hashToken(token);

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))
    `).run(id, userId, tokenHash, expiresInDays);

    return db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(id) as RefreshTokenRow;
  }, 'create refresh token', { retryOnFailure: false });
}

export async function rotateRefreshToken(
  userId: string,
  currentToken: string,
  replacementToken: string,
  expiresInDays = 2,
): Promise<RefreshTokenRow | null> {
  const currentHash = hashToken(currentToken);
  const replacementHash = hashToken(replacementToken);
  const replacementId = nanoid();

  return getWriteQueue().enqueue((db) => {
    const rotate = db.transaction(() => {
      const deleted = db.prepare(
        'DELETE FROM refresh_tokens WHERE user_id = ? AND token_hash = ?',
      ).run(userId, currentHash);
      if (deleted.changes !== 1) return null;

      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))
      `).run(replacementId, userId, replacementHash, expiresInDays);

      return db.prepare(
        'SELECT * FROM refresh_tokens WHERE id = ?',
      ).get(replacementId) as RefreshTokenRow;
    });

    return rotate.immediate();
  }, 'rotate refresh token', { retryOnFailure: false });
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const writeQueue = getWriteQueue();
  const tokenHash = hashToken(token);

  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  }, 'delete refresh token', { retryOnFailure: false });
}

export async function deleteAllUserTokens(userId: string): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
  }, 'delete all user refresh tokens', { retryOnFailure: false });
}

export async function cleanExpiredTokens(): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare("DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')").run();
  }, 'clean expired refresh tokens', { retryOnFailure: false });
}
