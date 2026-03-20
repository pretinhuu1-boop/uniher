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

  const rh = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!rh?.company_id) return NextResponse.json({ users: [] });

  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ? AND u.approved = 0
    ORDER BY u.created_at DESC
  `).all(rh.company_id) as any[];

  return NextResponse.json({ users });
});
