import { randomBytes } from 'crypto';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/mail';
import { passwordResetEmailHtml } from '@/lib/mail/templates';
import { beginAdministrativePasswordReset } from '@/repositories/password-reset.repository';

interface PasswordResetSubject {
  id: string;
  name: string;
  email: string;
}

function getPasswordResetOrigin(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NODE_ENV !== 'production') {
    return new URL(configuredUrl || 'http://localhost:3000').origin;
  }
  if (!configuredUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required for password reset in production');
  }

  const url = new URL(configuredUrl);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:'
    || (hostname !== 'uniher.com.br' && !hostname.endsWith('.uniher.com.br'))
  ) {
    throw new Error('Invalid production password reset origin');
  }
  return url.origin;
}

export async function requestUserPasswordReset(
  subject: PasswordResetSubject,
): Promise<{ delivered: boolean }> {
  const resetOrigin = getPasswordResetOrigin();
  const token = nanoid(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const replacementPasswordHash = await hashPassword(
    randomBytes(48).toString('base64url'),
  );

  const resetUrl = `${resetOrigin}/redefinir-senha?token=${token}`;
  const delivered = await sendEmail({
    to: subject.email,
    subject: 'Redefinir sua senha - UniHER',
    html: passwordResetEmailHtml({
      userName: subject.name,
      resetUrl,
    }),
  });
  if (!delivered) {
    return { delivered: false };
  }

  const resetStarted = await beginAdministrativePasswordReset({
    userId: subject.id,
    token,
    expiresAt,
    replacementPasswordHash,
  });

  return { delivered: resetStarted };
}
