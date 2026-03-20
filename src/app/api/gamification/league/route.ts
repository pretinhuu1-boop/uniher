import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserLeagueStatus, getLeagueRanking } from '@/services/league.service';

export const GET = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const status = getUserLeagueStatus(userId);
  const ranking = getLeagueRanking(status.currentLeague, status.weekStart);
  return NextResponse.json({ status, ranking });
});
