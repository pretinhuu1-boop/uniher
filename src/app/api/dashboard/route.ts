import { NextRequest, NextResponse } from 'next/server';

import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  dashboardQuerySchema,
  getProtectedDashboardProjection,
} from '@/services/dashboard.service';

const PROTECTED_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

function getLeadershipDepartmentId(userId: string, companyId: string): string | null {
  const db = getReadDb();
  const row = db.prepare(`
    SELECT department_id
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role = 'lideranca'
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(userId, companyId) as { department_id: string | null } | undefined;

  return row?.department_id ?? null;
}

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
      const departmentId = auth.role === 'lideranca'
        ? getLeadershipDepartmentId(auth.userId, companyId)
        : parsed.data.departmentId;

      if (auth.role === 'lideranca' && !departmentId) {
        return NextResponse.json(
          {
            error: 'LEADERSHIP_DEPARTMENT_REQUIRED',
            message: 'Vincule a lideranca a um departamento antes de acessar o dashboard.',
          },
          { status: 403, headers: PROTECTED_HEADERS },
        );
      }

      const projection = getProtectedDashboardProjection({
        companyId,
        period: parsed.data.period,
        departmentId: departmentId ?? undefined,
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
