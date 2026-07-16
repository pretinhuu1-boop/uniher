import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';

export const POST = withAuth(async (_req, { auth }) => {
  const row = getReadDb().prepare(
    'SELECT streak, last_active FROM users WHERE id = ?',
  ).get(auth.userId) as { streak: number; last_active: string | null } | undefined;
  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    streak: row?.streak ?? 0,
    checkedInToday: row?.last_active?.slice(0, 10) === today,
  });
});
