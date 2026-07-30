import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { mapHealthCheckinToSemaphore } from '@/lib/health-checkin/mapper';
import { healthCheckinSchema } from '@/lib/validation/schemas';
import { recordHealthCheckinConsent, recordHealthCheckinExams } from '@/repositories/health-checkin.repository';
import { recordHealthScore } from '@/repositories/health-score.repository';

export const POST = withRole('colaboradora', 'lideranca')(async (req: NextRequest, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = healthCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const result = mapHealthCheckinToSemaphore(input.answers, { conciergeEnabled: true });
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    await recordHealthCheckinConsent({ userId: auth.userId, ipAddress, userAgent });
    await recordHealthCheckinExams(auth.userId, result.examItems);

    for (const score of result.semaforoScores) {
      await recordHealthScore(auth.userId, score.dimension, score.score);
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
