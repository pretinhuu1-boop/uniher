import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStreakStatus } from '@/services/gamification.service';
import { getLevelFromPoints } from '@/services/gamification.service';

export const GET = withAuth(async (_req, context) => {
  try {
    const userId = context.auth.userId;
    const status = getStreakStatus(userId);
    const levelInfo = getLevelFromPoints(status.points);
    return NextResponse.json({ ...status, levelInfo });
  } catch (error) {
    console.error('[Streak] Error:', error);
    return NextResponse.json({
      streak: 0, freezes: 0, checkedInToday: false,
      dailyXpEarned: 0, dailyXpGoal: 100, level: 1,
      levelInfo: { level: 1, currentXP: 0, nextLevelXP: 100 },
    });
  }
});
