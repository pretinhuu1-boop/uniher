/**
 * POST /api/auth/confirm-first-access
 * Marks mustChangePassword as false and issues a new JWT without the flag.
 * Only works for users who are currently in mustChangePassword state.
 */
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';
import * as refreshTokenRepo from '@/repositories/refresh-token.repository';

export const POST = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();

  const user = db.prepare('SELECT id, role, company_id, is_master_admin, must_change_password FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  if (!user.must_change_password) {
    return NextResponse.json({ success: true, message: 'Já confirmado' });
  }

  // Update DB
  await getWriteQueue().enqueue((db) => {
    db.prepare('UPDATE users SET must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
  });

  // Issue new JWT without mustChangePassword
  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
    mustChangePassword: false,
  });

  // Rotate refresh token
  await refreshTokenRepo.deleteAllUserTokens(userId);
  const refreshToken = await signRefreshToken({ userId });
  await refreshTokenRepo.createRefreshToken(userId, refreshToken);
  const response = NextResponse.json({ success: true });
  return setAuthCookiesOnResponse(response, accessToken, refreshToken);
});
