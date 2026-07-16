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
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Filtros de dashboard inv\u00e1lidos.' },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    try {
      await initDb();
      const projection = getProtectedDashboardProjection({
        companyId: auth.companyId,
        period: parsed.data.period,
        departmentId: parsed.data.departmentId,
      });
      return NextResponse.json(projection, { headers: PROTECTED_HEADERS });
    } catch {
      return NextResponse.json(
        { error: 'N\u00e3o foi poss\u00edvel produzir a proje\u00e7\u00e3o protegida.' },
        { status: 500, headers: PROTECTED_HEADERS },
      );
    }
  },
);
