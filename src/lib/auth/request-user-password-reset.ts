import { nanoid } from 'nanoid';
import { getWriteQueue } from '@/lib/db';
import { sendEmail } from '@/lib/mail';
import { passwordResetEmailHtml } from '@/lib/mail/templates';
import {
  createResetToken,
  invalidateUserTokens,
} from '@/repositories/password-reset.repository';
import { deleteAllUserTokens } from '@/repositories/refresh-token.repository';

interface PasswordResetSubject {
  id: string;
  name: string;
  email: string;
}

export async function requestUserPasswordReset(
  subject: PasswordResetSubject,
): Promise<{ delivered: boolean }> {
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await invalidateUserTokens(subject.id);
  await createResetToken(subject.id, token, expiresAt);
  await deleteAllUserTokens(subject.id);
  await getWriteQueue().enqueue((db) => {
    db.prepare(`
      UPDATE users
      SET must_change_password = 1, updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(subject.id);
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha?token=${token}`;
  const delivered = await sendEmail({
    to: subject.email,
    subject: 'Redefinir sua senha - UniHER',
    html: passwordResetEmailHtml({
      userName: subject.name,
      resetUrl,
    }),
  });

  return { delivered };
}
