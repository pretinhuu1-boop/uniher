import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { completeMission } from '@/services/daily-missions.service';
import { checkAndUnlockBadges } from '@/services/gamification.service';

export const POST = withAuth(async (req, context) => {
  const userId = context.auth.userId;
  const { id: missionId } = await context.params;
  const body = await req.json().catch(() => ({}));

  const result = await completeMission(userId, missionId, body);
  if (!result.success) {
    return NextResponse.json({ error: 'Missão não encontrada ou já completada' }, { status: 400 });
  }

  const badgesUnlocked = await checkAndUnlockBadges(userId);
  return NextResponse.json({ ...result, badgesUnlocked });
});
