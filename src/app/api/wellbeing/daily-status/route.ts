import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getDailyWellbeingStatus, WELLBEING_MOODS } from '@/services/wellbeing.service';

export const GET = withAuth(async (_req, { auth }) => {
  await initDb();

  return NextResponse.json({
    ...getDailyWellbeingStatus(auth.userId),
    moods: WELLBEING_MOODS,
  });
});
