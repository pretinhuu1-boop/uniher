import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';
import { consumeResetTokenAndUpdatePassword } from '@/repositories/password-reset.repository';

const Schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Precisa de 1 letra maiuscula')
    .regex(/[a-z]/, 'Precisa de 1 letra minuscula')
    .regex(/[0-9]/, 'Precisa de 1 numero')
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
        { status: 422 },
      );
    }

    const { token, password } = parsed.data;
    const passwordHash = await hashPassword(password);
    const consumed = await consumeResetTokenAndUpdatePassword(token, passwordHash);

    if (!consumed) {
      return NextResponse.json(
        { error: 'Token invalido ou expirado' },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
