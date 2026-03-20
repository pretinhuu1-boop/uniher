import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getLeagueRanking, LEAGUES } from '@/services/league.service';
import { getReadDb } from '@/lib/db';
import { getWeekStart } from '@/services/gamification.service';

export const GET = withAuth(async (req, context) => {
  const userId = context.auth.userId;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'department';

  const db = getReadDb();
  const user = db.prepare('SELECT department_id, company_id FROM users WHERE id = ?').get(userId) as any;

  if (type === 'league') {
    const userLeague = (db.prepare('SELECT league FROM users WHERE id = ?').get(userId) as any)?.league || 'bronze';
    const ranking = getLeagueRanking(userLeague as any);
    return NextResponse.json({ ranking, type: 'league' });
  }

  // Department leaderboard
  const ws = getWeekStart();
  const rows = db.prepare(`
    SELECT u.id, u.name, u.avatar_url, u.points, u.level, u.league,
           COALESCE(ul.week_points, 0) as week_points,
           d.name as department_name
    FROM users u
    LEFT JOIN user_leagues ul ON ul.user_id = u.id AND ul.week_start = ?
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ? AND u.role = 'colaboradora'
    ORDER BY ul.week_points DESC NULLS LAST, u.points DESC
    LIMIT 20
  `).all(ws, user?.company_id) as any[];

  const ranking = rows.map((r, i) => ({ rank: i + 1, ...r }));
  return NextResponse.json({ ranking, type: 'department' });
});
