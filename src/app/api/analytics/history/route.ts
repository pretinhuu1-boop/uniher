import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';

export const GET = withRole('rh', 'admin', 'lideranca')(async (req: NextRequest, context) => {
  try {
    await initDb();
    const db = getReadDb();

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get('period') || '6', 10);
    const validPeriods = [3, 6, 12];
    const months = validPeriods.includes(period) ? period : 6;
    const department = searchParams.get('department') || null;

    const companyId = context.auth.companyId;
    const isAdmin = context.auth.role === 'admin' && !companyId;

    // Monthly points per department (filtered by company for RH/lideranca)
    const monthlyQuery = `
      SELECT
        strftime('%Y-%m', al.created_at) as month,
        d.name as department,
        SUM(al.points_earned) as total_points
      FROM activity_log al
      JOIN users u ON u.id = al.user_id
      JOIN departments d ON d.id = u.department_id
      WHERE al.created_at >= datetime('now', '-${months} months')
      ${isAdmin ? '' : 'AND d.company_id = ?'}
      ${department ? "AND d.name = ?" : ""}
      GROUP BY month, d.name
      ORDER BY month DESC, total_points DESC
    `;

    const monthlyParams = [...(isAdmin ? [] : [companyId]), ...(department ? [department] : [])];
    const monthlyRaw = db.prepare(monthlyQuery).all(...monthlyParams) as {
      month: string;
      department: string;
      total_points: number;
    }[];

    // Organize by month with department columns
    const monthMap = new Map<string, Record<string, number>>();
    const allDepts = new Set<string>();

    monthlyRaw.forEach(row => {
      allDepts.add(row.department);
      if (!monthMap.has(row.month)) {
        monthMap.set(row.month, {});
      }
      monthMap.get(row.month)![row.department] = row.total_points;
    });

    // If no activity_log data, fall back to users.points by department
    if (monthlyRaw.length === 0) {
      const fallbackQuery = `
        SELECT d.name as department, SUM(u.points) as total_points, COUNT(u.id) as user_count
        FROM users u
        JOIN departments d ON d.id = u.department_id
        WHERE 1=1
        ${isAdmin ? '' : 'AND d.company_id = ?'}
        ${department ? "AND d.name = ?" : ""}
        GROUP BY d.name
        ORDER BY total_points DESC
      `;
      const fallbackParams = [...(isAdmin ? [] : [companyId]), ...(department ? [department] : [])];
      const fallbackData = db.prepare(fallbackQuery).all(...fallbackParams) as {
        department: string;
        total_points: number;
        user_count: number;
      }[];

      fallbackData.forEach(row => allDepts.add(row.department));

      const currentMonth = new Date().toISOString().slice(0, 7);
      const deptPoints: Record<string, number> = {};
      fallbackData.forEach(row => { deptPoints[row.department] = row.total_points; });
      monthMap.set(currentMonth, deptPoints);
    }

    const departments = Array.from(allDepts);

    const monthlyData = Array.from(monthMap.entries()).map(([month, depts]) => ({
      month,
      ...Object.fromEntries(departments.map(d => [d, depts[d] || 0])),
    }));

    // Ranking: departments sorted by total points with badge counts (filtered by company)
    const rankingQuery = `
      SELECT
        d.name as department,
        COALESCE(SUM(u.points), 0) as total_points,
        COUNT(DISTINCT ub.badge_id) as badge_count
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id
      LEFT JOIN user_badges ub ON ub.user_id = u.id
      WHERE 1=1
      ${isAdmin ? '' : 'AND d.company_id = ?'}
      ${department ? "AND d.name = ?" : ""}
      GROUP BY d.name
      ORDER BY total_points DESC
    `;

    const rankingParams = [...(isAdmin ? [] : [companyId]), ...(department ? [department] : [])];
    const ranking = db.prepare(rankingQuery).all(...rankingParams) as {
      department: string;
      total_points: number;
      badge_count: number;
    }[];

    return NextResponse.json({
      period: months,
      departments,
      monthlyData,
      ranking: ranking.map((r, i) => ({
        rank: i + 1,
        department: r.department,
        points: r.total_points,
        badgeCount: r.badge_count,
      })),
    });
  } catch (error) {
    console.error('[analytics/history] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
