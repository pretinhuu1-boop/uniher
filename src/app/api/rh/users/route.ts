/**
 * GET /api/rh/users — list users in the RH's company
 * Supports: ?search=, &department=, &role=, &status=active|blocked, &limit=, &offset=
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkReadRateLimit } from '@/lib/security/rate-limit';

export const GET = withRole('rh')(async (req, context) => {
  await checkReadRateLimit(req);
  await initDb();
  const db = getReadDb();

  const companyId = context.auth.companyId;
  if (!companyId) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() || '';
  const department = url.searchParams.get('department') || '';
  const role = url.searchParams.get('role') || '';
  const status = url.searchParams.get('status') || ''; // active | blocked
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const conditions: string[] = ['u.company_id = ?', 'u.deleted_at IS NULL'];
  const params: (string | number)[] = [companyId];

  if (search) {
    conditions.push("(u.name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (department) {
    conditions.push('u.department_id = ?');
    params.push(department);
  }
  if (role) {
    conditions.push('u.role = ?');
    params.push(role);
  }
  if (status === 'active') {
    conditions.push('u.blocked = 0');
  } else if (status === 'blocked') {
    conditions.push('u.blocked = 1');
  }

  const where = conditions.join(' AND ');

  const total = (db.prepare(`
    SELECT COUNT(*) as cnt FROM users u WHERE ${where}
  `).get(...params) as { cnt: number }).cnt;

  const users = db.prepare(`
    SELECT
      u.id, u.name, u.email, u.role, u.department_id,
      u.level, u.points, u.blocked, u.approved, u.created_at,
      d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  // Stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN blocked = 0 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked_count
    FROM users
    WHERE company_id = ? AND deleted_at IS NULL
  `).get(companyId) as { total: number; active: number; blocked_count: number };

  const deptStats = db.prepare(`
    SELECT d.id, d.name, COUNT(u.id) as user_count
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.company_id = d.company_id AND u.deleted_at IS NULL
    WHERE d.company_id = ?
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all(companyId) as any[];

  return NextResponse.json({
    users,
    total,
    limit,
    offset,
    stats: {
      total: stats.total,
      active: stats.active,
      blocked: stats.blocked_count,
      departments: deptStats,
    },
  });
});
