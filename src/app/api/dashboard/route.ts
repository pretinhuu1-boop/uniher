import { NextRequest, NextResponse } from 'next/server';

import { withRole } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import {
  dashboardQuerySchema,
  getProtectedDashboardProjection,
} from '@/services/dashboard.service';

const PROTECTED_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

export const GET = withRole('admin', 'rh', 'lideranca')(
  async (req: NextRequest, { auth }) => {
    const parsed = dashboardQuerySchema.safeParse({
      period: req.nextUrl.searchParams.get('period') ?? undefined,
      departmentId: req.nextUrl.searchParams.get('departmentId') ?? undefined,
      companyId: req.nextUrl.searchParams.get('companyId') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Filtros de dashboard inválidos.' },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    const requestedCompanyId = parsed.data.companyId;
    const isCompanylessMasterAdmin =
      auth.role === 'admin' && auth.isMasterAdmin === true && !auth.companyId;

    if (isCompanylessMasterAdmin && !requestedCompanyId) {
      return NextResponse.json(
        {
          error: 'COMPANY_SCOPE_REQUIRED',
          message: 'Selecione uma empresa antes de acessar o dashboard RH.',
        },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    if (!isCompanylessMasterAdmin && requestedCompanyId && requestedCompanyId !== auth.companyId) {
      return NextResponse.json(
        {
          error: 'COMPANY_SCOPE_FORBIDDEN',
          message: 'O escopo de empresa do dashboard deve vir da sessão autenticada.',
        },
        { status: 403, headers: PROTECTED_HEADERS },
      );
    }

    const companyId = isCompanylessMasterAdmin ? requestedCompanyId : auth.companyId;
    if (!companyId) {
      return NextResponse.json(
        {
          error: 'COMPANY_SCOPE_REQUIRED',
          message: 'Selecione uma empresa antes de acessar o dashboard RH.',
        },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    try {
      await initDb();
      const projection = getProtectedDashboardProjection({
        companyId,
        period: parsed.data.period,
        departmentId: parsed.data.departmentId,
      });
      return NextResponse.json(projection, { headers: PROTECTED_HEADERS });
    } catch {
      return NextResponse.json(
        { error: 'Não foi possível produzir a projeção protegida.' },
        { status: 500, headers: PROTECTED_HEADERS },
      );
    }
  },
);
