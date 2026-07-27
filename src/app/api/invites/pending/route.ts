/**
 * GET /api/invites/pending — list users with approved = 0 for the RH's company
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const GET = withRole('rh', 'lideranca')(async (_req, context) => {
  const userId = context.auth.userId;
  await initDb();
  const db = getReadDb();

  const rh = db.prepare(`
    SELECT company_id, role, department_id
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role IN ('rh', 'lideranca')
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(userId, context.auth.companyId) as any;
  if (!rh || rh.role !== context.auth.role) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
  }
  if (!rh?.company_id) return NextResponse.json({ users: [] });

  if (rh.role === 'lideranca' && !rh.department_id) {
    return NextResponse.json({ users: [] });
  }

  const conditions = ['u.company_id = ?', 'u.approved = 0'];
  const params: unknown[] = [rh.company_id];
  if (rh.role === 'lideranca') {
    conditions.push('u.department_id = ?', "u.role = 'colaboradora'");
    params.push(rh.department_id);
  }

  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY u.created_at DESC
  `).all(...params) as any[];

  return NextResponse.json({ users });
});
