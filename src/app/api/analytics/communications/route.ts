import { NextRequest, NextResponse } from 'next/server';

import { withRole } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import {
  communicationsQuerySchema,
  getProtectedCommunicationsProjection,
} from '@/services/dashboard.service';

const PROTECTED_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

export const GET = withRole('rh', 'admin')(
  async (req: NextRequest, { auth }) => {
    const parsed = communicationsQuerySchema.safeParse({
      period: req.nextUrl.searchParams.get('period') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Filtro de comunica\u00e7\u00f5es inv\u00e1lido.' },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    try {
      await initDb();
      const projection = getProtectedCommunicationsProjection({
        companyId: auth.companyId,
        period: parsed.data.period,
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
