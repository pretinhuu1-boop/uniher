/**
 * GET /api/rh/agenda — lista eventos de todas as colaboradoras da empresa
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

const MINIMUM_COHORT = 5;

export const GET = withRole('rh', 'lideranca', 'admin')(async (req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const companyId = context.auth.companyId;

  if (!companyId) {
    return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 403 });
  }

  const url = new URL(req.url);
  const requestedMonth = url.searchParams.get('month');
  const month = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : new Date().toISOString().slice(0, 7);

  const userScope = [
    'u.company_id = ?',
    "u.role = 'colaboradora'",
    'COALESCE(u.blocked, 0) = 0',
    'COALESCE(u.approved, 1) = 1',
    'u.deleted_at IS NULL',
  ];
  const userParams: string[] = [companyId];

  if (context.auth.role === 'lideranca') {
    const leader = db.prepare(`
      SELECT department_id
      FROM users
      WHERE id = ? AND company_id = ? AND role = 'lideranca' AND deleted_at IS NULL
    `).get(context.auth.userId, companyId) as { department_id: string | null } | undefined;
    if (!leader?.department_id) {
      return NextResponse.json({
        events: [],
        stats: { suppressed: true, minimumCohort: MINIMUM_COHORT },
      });
    }
    userScope.push('u.department_id = ?');
    userParams.push(leader.department_id);
  }

  const cohort = db.prepare(`
    SELECT COUNT(*) AS count
    FROM users u
    WHERE ${userScope.join(' AND ')}
  `).get(...userParams) as { count: number };

  if (cohort.count < MINIMUM_COHORT) {
    return NextResponse.json({
      events: [],
      stats: { suppressed: true, minimumCohort: MINIMUM_COHORT },
    });
  }

  const stats = db.prepare(`
    SELECT COUNT(*) AS total, COUNT(DISTINCT he.user_id) AS contributors
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE he.company_id = ?
      AND he.deleted_at IS NULL
      AND he.date LIKE ?
      AND ${userScope.join(' AND ')}
  `).get(companyId, `${month}%`, ...userParams) as { total: number; contributors: number };

  if (stats.total < MINIMUM_COHORT || stats.contributors < MINIMUM_COHORT) {
    return NextResponse.json({
      events: [],
      stats: { suppressed: true, minimumCohort: MINIMUM_COHORT },
    });
  }

  return NextResponse.json({
    events: [],
    stats: {
      suppressed: false,
      minimumCohort: MINIMUM_COHORT,
      total: stats.total,
    },
  });
});
