import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { countUnread } from '@/repositories/notification.repository';

export const GET = withAuth(async (_req, context) => {
  await initDb();
  const userId = context.auth.userId;
  return NextResponse.json({ unread: countUnread(userId) });
});
