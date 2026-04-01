import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { dailyCheckIn } from '@/services/gamification.service';
import { ensureDailyMissions } from '@/services/daily-missions.service';

export const POST = withAuth(async (_req, context) => {
  try {
    const userId = context.auth.userId;
    const result = await dailyCheckIn(userId);

    // Idempotency: return 429 if already checked in today so concurrent
    // requests cannot all "succeed" — only the first one gets 200.
    if (result.alreadyDone) {
      return NextResponse.json(
        { error: 'Check-in já realizado hoje', alreadyDone: true },
        { status: 429 }
      );
    }

    // Ensure daily missions are generated for today
    await ensureDailyMissions(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CheckIn] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao realizar check-in' },
      { status: 500 }
    );
  }
});
