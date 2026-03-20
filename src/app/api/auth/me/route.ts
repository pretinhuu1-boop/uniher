import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { getMe } from '@/services/auth.service';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getCompanyById } from '@/repositories/company.repository';

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();

    const user = getMe(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const company = getCompanyById(user.company_id);

    return NextResponse.json({
      user: {
        ...user,
        mustChangePassword: auth.mustChangePassword === true,
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
