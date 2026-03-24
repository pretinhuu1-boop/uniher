import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export async function createResetToken(userId: string, token: string, expiresAt: string): Promise<PasswordResetTokenRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, token, expiresAt);
    return db.prepare('SELECT * FROM password_reset_tokens WHERE id = ?').get(id) as PasswordResetTokenRow;
  });
}

export function getValidToken(token: string): PasswordResetTokenRow | undefined {
  const db = getReadDb();
  return db.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime(\'now\')'
  ).get(token) as PasswordResetTokenRow | undefined;
}

export async function markTokenUsed(tokenId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenId);
  });
}

export async function invalidateUserTokens(userId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);
  });
}
