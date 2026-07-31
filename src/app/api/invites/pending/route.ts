/**
 * GET /api/invites/pending — list users with approved = 0 for the RH's company
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { getActiveLeaderApprover, hasActiveRhActor } from '@/lib/security/active-rh-actor';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  department_name: string | null;
}

export const GET = withRole('rh', 'lideranca')(async (_req, context) => {
  await initDb();
  const db = getReadDb();
  const { userId, companyId, role } = context.auth;

  let departmentId: string | undefined;
  if (role === 'rh') {
    if (!hasActiveRhActor(db, userId, companyId)) {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }
  } else {
    const leader = getActiveLeaderApprover(db, userId, companyId);
    if (!leader?.departmentId) {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }
    departmentId = leader.departmentId;
  }

  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ?
      AND u.approved = 0
      AND u.deleted_at IS NULL
      ${departmentId ? "AND u.department_id = ? AND u.role = 'colaboradora'" : ''}
    ORDER BY u.created_at DESC
  `).all(...(departmentId ? [companyId, departmentId] : [companyId])) as PendingUser[];

  return NextResponse.json({ users });
});
