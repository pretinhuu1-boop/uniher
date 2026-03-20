import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStreakStatus } from '@/services/gamification.service';
import { getLevelFromPoints } from '@/services/gamification.service';

export const GET = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const status = getStreakStatus(userId);
  const levelInfo = getLevelFromPoints(status.points);
  return NextResponse.json({ ...status, levelInfo });
});
