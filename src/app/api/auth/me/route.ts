import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { getMe } from '@/services/auth.service';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getCompanyById } from '@/repositories/company.repository';
import { getReadDb } from '@/lib/db';

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();

    const user = getMe(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const company = user.company_id ? getCompanyById(user.company_id) : null;
    const prefRow = getReadDb()
      .prepare("SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = 'first_access_tour_completed'")
      .get(auth.userId) as { pref_value?: string } | undefined;
    const firstAccessTourCompleted =
      prefRow?.pref_value === '1' || (!prefRow && auth.mustChangePassword !== true);

    return NextResponse.json({
      user: {
        ...user,
        isMasterAdmin: user.is_master_admin === 1 || auth.isMasterAdmin === true,
        mustChangePassword: auth.mustChangePassword === true,
        firstAccessTourCompleted,
      },
      company: company ? {
        id: company.id,
        name: company.name,
        tradeName: company.trade_name,
        plan: company.plan,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
