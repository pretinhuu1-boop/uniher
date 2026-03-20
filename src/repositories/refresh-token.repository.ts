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
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime("now")'
  ).get(tokenHash) as RefreshTokenRow | undefined;
}

export function findValidToken(token: string): RefreshTokenRow | undefined {
  return findByTokenHash(hashToken(token));
}

export async function createRefreshToken(userId: string, token: string, expiresInDays = 7): Promise<RefreshTokenRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();
  const tokenHash = hashToken(token);

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))
    `).run(id, userId, tokenHash, expiresInDays);

    return db.prepare('SELECT * FROM refresh_tokens WHERE id = ?').get(id) as RefreshTokenRow;
  });
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const writeQueue = getWriteQueue();
  const tokenHash = hashToken(token);

  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  });
}

export async function deleteAllUserTokens(userId: string): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
  });
}

export async function cleanExpiredTokens(): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM refresh_tokens WHERE expires_at <= datetime("now")').run();
  });
}
