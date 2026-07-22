import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const GET = withAuth(async (_req, { auth }) => {
  await initDb();
  const activities = getReadDb().prepare(`
    SELECT id, action, target_type, target_id, created_at
    FROM activity_log
    WHERE user_id = ? AND action = 'read_content'
    ORDER BY created_at DESC
    LIMIT 100
  `).all(auth.userId);
  return NextResponse.json({ activities });
});

export const POST = withAuth(async () => privacyReviewResponse());
