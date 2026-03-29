import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const GET = withAuth(async (_req, context) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;

  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(userId) as { count: number };

  return NextResponse.json({ unread: row.count });
});
