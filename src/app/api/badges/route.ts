import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

// GET /api/badges - list badges for authenticated users (non-admin surface)
export const GET = withAuth(async (_req: NextRequest) => {
  await initDb();
  const db = getReadDb();

  const badges = db.prepare(`
    SELECT b.id, b.name, b.description, b.icon, b.points, b.rarity, b.created_at,
           COUNT(ub.user_id) AS holder_count
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all();

  return NextResponse.json({ badges });
});

