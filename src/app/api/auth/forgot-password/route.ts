import { NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';
import { checkForgotPasswordRateLimit } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/errors';
import { sendEmail } from '@/lib/mail';
import { passwordResetEmailHtml } from '@/lib/mail/templates';
import { createResetToken, invalidateUserTokens } from '@/repositories/password-reset.repository';

const Schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    await initDb();

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 422 }
      );
    }

    const { email } = parsed.data;
    await checkForgotPasswordRateLimit(req, email);
    const user = getReadDb().prepare('SELECT id, name, email FROM users WHERE email = ?').get(email) as
      | { id: string; name: string; email: string }
      | undefined;

    if (user) {
      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 3600000).toISOString();

      await invalidateUserTokens(user.id);
      await createResetToken(user.id, token, expiresAt);

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: 'Redefinir sua senha — UniHER',
        html: passwordResetEmailHtml({ userName: user.name, resetUrl }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, enviaremos instruções.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
