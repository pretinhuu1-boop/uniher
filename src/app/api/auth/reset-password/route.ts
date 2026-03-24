import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { getWriteQueue } from '@/lib/db';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';
import { getValidToken, markTokenUsed } from '@/repositories/password-reset.repository';

const Schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
    .regex(/[a-z]/, 'Precisa de 1 letra minúscula')
    .regex(/[0-9]/, 'Precisa de 1 número')
    .regex(/[!@#$%&*]/, 'Precisa de 1 caractere especial (!@#$%&*)'),
});

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { token, password } = parsed.data;
    const resetToken = getValidToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = resetToken.user_id;

    await getWriteQueue().enqueue((db) => {
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .run(passwordHash, userId);
    });

    await markTokenUsed(resetToken.id);

    // Force re-login by deleting all refresh tokens
    await getWriteQueue().enqueue((db) => {
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
