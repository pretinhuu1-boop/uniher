import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { getDailyWellbeingStatus } from '@/services/wellbeing.service';

export const GET = withAuth(async (_req, context) => {
  await initDb();
  const row = getReadDb().prepare(
    'SELECT streak, last_active FROM users WHERE id = ?',
  ).get(context.auth.userId) as { streak: number; last_active: string | null } | undefined;
  const today = new Date().toISOString().slice(0, 10);
  const wellbeing = getDailyWellbeingStatus(context.auth.userId, today);

  return NextResponse.json({
    streak: row?.streak ?? 0,
    checkedInToday: row?.last_active?.slice(0, 10) === today || wellbeing.checkedInToday,
    checkedOutToday: wellbeing.checkedOutToday,
    checkInMood: wellbeing.checkInMood,
    checkOutMood: wellbeing.checkOutMood,
  });
});
