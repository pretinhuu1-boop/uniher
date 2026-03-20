/**
 * GET /api/departments — list departments for the current user's company
 */
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const GET = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  await initDb();
  const db = getReadDb();

  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ departments: [] });

  const departments = db.prepare(`
    SELECT id, name FROM departments
    WHERE company_id = ?
    ORDER BY name ASC
  `).all(user.company_id) as any[];

  return NextResponse.json({ departments });
});
