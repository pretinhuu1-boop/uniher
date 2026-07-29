import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { dailyCheckIn } from '@/services/gamification.service';
import { ensureDailyMissions } from '@/services/daily-missions.service';
import { normalizeWellbeingMood, recordWellbeingEvent } from '@/services/wellbeing.service';

export const POST = withAuth(async (req, context) => {
  try {
    await initDb();
    const userId = context.auth.userId;
    const body = await req.json().catch(() => ({})) as { mood?: unknown };
    const result = await dailyCheckIn(userId);
    const wellbeing = await recordWellbeingEvent({
      userId,
      companyId: context.auth.companyId,
      eventType: 'check_in',
      mood: normalizeWellbeingMood(body.mood),
    });

    // Legacy streak and wellbeing events can be out of sync during migration.
    // Reject only when both records already exist for today.
    if (result.alreadyDone && wellbeing.alreadyDone) {
      return NextResponse.json(
        { error: 'Check-in já realizado hoje', alreadyDone: true },
        { status: 429 }
      );
    }

    // Ensure daily missions are generated for today
    await ensureDailyMissions(userId);
    return NextResponse.json({
      ...result,
      wellbeing: {
        checkedInToday: wellbeing.checkedInToday,
        checkInMood: wellbeing.checkInMood,
      },
    });
  } catch (error) {
    console.error('[CheckIn] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao realizar check-in' },
      { status: 500 }
    );
  }
});
