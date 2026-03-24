import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ensureDailyMissions } from '@/services/daily-missions.service';

export const GET = withAuth(async (_req, context) => {
  try {
    const userId = context.auth.userId;
    const missions = await ensureDailyMissions(userId);
    return NextResponse.json({ missions });
  } catch (error) {
    console.error('[DailyMissions] Error:', error);
    return NextResponse.json({ missions: [] });
  }
});
