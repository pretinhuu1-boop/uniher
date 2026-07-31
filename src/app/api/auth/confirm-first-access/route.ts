import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';
import * as refreshTokenRepo from '@/repositories/refresh-token.repository';

export const POST = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();

  const user = db.prepare(`
    SELECT id, role, company_id, is_master_admin, must_change_password, password_reset_required
    FROM users
    WHERE id = ?
  `).get(userId) as {
    id: string;
    role: string;
    company_id: string | null;
    is_master_admin: number;
    must_change_password: number;
    password_reset_required: number;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
  }

  if (user.password_reset_required) {
    return NextResponse.json(
      { error: 'Redefinicao de senha por link obrigatoria' },
      { status: 403 },
    );
  }

  if (user.must_change_password) {
    await getWriteQueue().enqueue((writeDb) => {
      writeDb.prepare(`
        UPDATE users
        SET must_change_password = 0, updated_at = datetime('now')
        WHERE id = ? AND password_reset_required = 0
      `).run(userId);
    });
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
    mustChangePassword: false,
  });

  await refreshTokenRepo.deleteAllUserTokens(userId);
  const refreshToken = await signRefreshToken({ userId });
  await refreshTokenRepo.createRefreshToken(userId, refreshToken);

  const response = NextResponse.json({ success: true });
  return setAuthCookiesOnResponse(response, accessToken, refreshToken);
});
