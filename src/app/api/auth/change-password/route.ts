import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';
import { initDb } from '@/lib/db/init';
import { completeForcedPasswordChange } from '@/repositories/first-access.repository';
import { z } from 'zod';

const Schema = z.object({
  newPassword: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
    .regex(/[a-z]/, 'Precisa de 1 letra minúscula')
    .regex(/[0-9]/, 'Precisa de 1 número')
    .regex(/[!@#$%&*]/, 'Precisa de 1 caractere especial (!@#$%&*)'),
});

export const POST = withAuth(async (req: NextRequest, context) => {
  await initDb();
  if (
    !context.auth.mustChangePassword
    || context.auth.passwordResetRequired
  ) {
    return NextResponse.json(
      { error: 'Troca forcada de senha nao autorizada' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const accessToken = await signAccessToken({
    userId: context.auth.userId,
    role: context.auth.role,
    companyId: context.auth.companyId,
    isMasterAdmin: context.auth.isMasterAdmin,
    mustChangePassword: false,
  });
  const refreshToken = await signRefreshToken({ userId: context.auth.userId });

  const completed = await completeForcedPasswordChange({
    userId: context.auth.userId,
    passwordHash,
    refreshToken,
  });
  if (!completed) {
    return NextResponse.json(
      { error: 'Troca de senha ja concluida ou indisponivel' },
      { status: 409 },
    );
  }

  return setAuthCookiesOnResponse(
    NextResponse.json({ success: true }),
    accessToken,
    refreshToken,
  );
});
