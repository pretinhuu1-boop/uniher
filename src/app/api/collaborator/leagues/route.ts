/**
 * GET /api/collaborator/leagues  — list available + joined custom leagues for user
 */
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { getWeekStart } from '@/services/gamification.service';

export const GET = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id, department_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ leagues: [] });

  const ws = getWeekStart();

  // All active leagues for this company (opt_in) or user's department
  const leagues = db.prepare(`
    SELECT cl.*,
           COUNT(DISTINCT clm.user_id) as member_count,
           MAX(CASE WHEN clm.user_id = ? THEN 1 ELSE 0 END) as is_member,
           COALESCE(myPoints.week_points, 0) as my_week_points
    FROM custom_leagues cl
    LEFT JOIN custom_league_members clm ON clm.league_id = cl.id AND clm.week_start = ?
    LEFT JOIN custom_league_members myPoints ON myPoints.league_id = cl.id AND myPoints.user_id = ? AND myPoints.week_start = ?
    WHERE cl.company_id = ? AND cl.is_active = 1
      AND (cl.type = 'opt_in' OR cl.type = 'company'
           OR (cl.type = 'department' AND cl.department_id = ?))
    GROUP BY cl.id
    ORDER BY cl.created_at DESC
  `).all(userId, ws, userId, ws, user.company_id, user.department_id || '') as any[];

  return NextResponse.json({ leagues: leagues.map(l => ({ ...l, is_member: l.is_member === 1 })) });
});
