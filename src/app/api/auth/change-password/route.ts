import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/password';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';
import * as refreshTokenRepo from '@/repositories/refresh-token.repository';
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
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?")
      .run(passwordHash, context.auth.userId);
    db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES (?, 'first_access_tour_completed', '0', datetime('now'))
      ON CONFLICT(user_id, pref_key) DO UPDATE SET
        pref_value = excluded.pref_value,
        updated_at = excluded.updated_at
    `).run(context.auth.userId);
  });

  const user = getReadDb()
    .prepare('SELECT id, role, company_id, is_master_admin FROM users WHERE id = ?')
    .get(context.auth.userId) as
    | { id: string; role: string; company_id: string | null; is_master_admin: number }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
    mustChangePassword: false,
  });

  await refreshTokenRepo.deleteAllUserTokens(user.id);
  const refreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken);

  const response = NextResponse.json({ success: true });
  return setAuthCookiesOnResponse(response, accessToken, refreshToken);
});
