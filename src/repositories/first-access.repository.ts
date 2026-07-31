import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { getWriteQueue } from '@/lib/db';

interface ForcedPasswordChangeInput {
  userId: string;
  passwordHash: string;
  refreshToken: string;
}

export async function completeForcedPasswordChange(
  input: ForcedPasswordChangeInput,
): Promise<boolean> {
  const refreshTokenHash = createHash('sha256')
    .update(input.refreshToken)
    .digest('hex');
  const refreshTokenId = nanoid();

  return getWriteQueue().enqueue((db) => {
    const complete = db.transaction(() => {
      const updated = db.prepare(`
        UPDATE users
        SET password_hash = ?,
            must_change_password = 0,
            updated_at = datetime('now')
        WHERE id = ?
          AND must_change_password = 1
          AND password_reset_required = 0
      `).run(input.passwordHash, input.userId);
      if (updated.changes !== 1) return false;

      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(input.userId);
      db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES (?, ?, ?, datetime('now', '+2 days'))
      `).run(refreshTokenId, input.userId, refreshTokenHash);
      return true;
    });

    return complete.immediate();
  });
}
