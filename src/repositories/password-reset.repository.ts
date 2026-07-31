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

interface AdministrativePasswordResetInput {
  userId: string;
  token: string;
  expiresAt: string;
  replacementPasswordHash: string;
  expectedCompanyId?: string;
}

export async function beginAdministrativePasswordReset(
  input: AdministrativePasswordResetInput,
): Promise<boolean> {
  const id = nanoid();

  return getWriteQueue().enqueue((db) => {
    const reset = db.transaction(() => {
      const user = input.expectedCompanyId
        ? db.prepare(`
            SELECT id
            FROM users
            WHERE id = ?
              AND company_id = ?
              AND role IN ('lideranca', 'colaboradora')
              AND deleted_at IS NULL
          `).get(input.userId, input.expectedCompanyId)
        : db.prepare(
            'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
          ).get(input.userId);
      if (!user) return false;

      db.prepare(
        'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      ).run(input.userId);
      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(id, input.userId, input.token, input.expiresAt);
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(input.userId);
      const result = input.expectedCompanyId
        ? db.prepare(`
            UPDATE users
            SET password_hash = ?,
                must_change_password = 1,
                password_reset_required = 1,
                session_version = session_version + 1,
                updated_at = datetime('now')
            WHERE id = ?
              AND company_id = ?
              AND role IN ('lideranca', 'colaboradora')
              AND deleted_at IS NULL
          `).run(
            input.replacementPasswordHash,
            input.userId,
            input.expectedCompanyId,
          )
        : db.prepare(`
            UPDATE users
            SET password_hash = ?,
                must_change_password = 1,
                password_reset_required = 1,
                session_version = session_version + 1,
                updated_at = datetime('now')
            WHERE id = ? AND deleted_at IS NULL
          `).run(input.replacementPasswordHash, input.userId);

      return result.changes === 1;
    });

    return reset.immediate();
  }, 'begin administrative password reset', { retryOnFailure: false });
}

export async function consumeResetTokenAndUpdatePassword(
  token: string,
  passwordHash: string,
): Promise<boolean> {
  return getWriteQueue().enqueue((db) => {
    const consume = db.transaction(() => {
      const resetToken = db.prepare(`
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token = ? AND used = 0 AND expires_at > datetime('now')
      `).get(token) as Pick<PasswordResetTokenRow, 'id' | 'user_id'> | undefined;
      if (!resetToken) return false;

      const consumed = db.prepare(`
        UPDATE password_reset_tokens
        SET used = 1
        WHERE id = ? AND used = 0 AND expires_at > datetime('now')
      `).run(resetToken.id);
      if (consumed.changes !== 1) return false;

      const updated = db.prepare(`
        UPDATE users
        SET password_hash = ?,
            must_change_password = 0,
            password_reset_required = 0,
            session_version = session_version + 1,
            updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL
      `).run(passwordHash, resetToken.user_id);
      if (updated.changes !== 1) return false;

      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(resetToken.user_id);
      return true;
    });

    return consume.immediate();
  }, 'consume password reset token', { retryOnFailure: false });
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
  }, 'create password reset token', { retryOnFailure: false });
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
  }, 'mark password reset token used', { retryOnFailure: false });
}

export async function invalidateUserTokens(userId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(userId);
  }, 'invalidate password reset tokens', { retryOnFailure: false });
}
