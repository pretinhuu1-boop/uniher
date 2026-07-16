import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withRole } from '@/lib/auth/middleware';
import { HISTORY_PERIODS } from '@/types/platform';
import type { UnavailableHistoryProjection } from '@/types/platform';

const historyQuerySchema = z.object({
  period: z.enum(HISTORY_PERIODS).default('6'),
  departmentId: z.string().trim().min(1).max(128).optional(),
}).strict();

const PROTECTED_HEADERS = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
} as const;

const UNAVAILABLE_HISTORY: UnavailableHistoryProjection = {
  status: 'unavailable',
  reason: 'eligible_ledger_required',
  message: 'Hist\u00f3rico indispon\u00edvel at\u00e9 existir um registro eleg\u00edvel e protegido.',
};

export const GET = withRole('rh', 'admin', 'lideranca')(
  async (req: NextRequest) => {
    const parsed = historyQuerySchema.safeParse({
      period: req.nextUrl.searchParams.get('period') ?? undefined,
      departmentId: req.nextUrl.searchParams.get('departmentId') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Filtros de hist\u00f3rico inv\u00e1lidos.' },
        { status: 400, headers: PROTECTED_HEADERS },
      );
    }

    return NextResponse.json(UNAVAILABLE_HISTORY, {
      status: 410,
      headers: PROTECTED_HEADERS,
    });
  },
);
