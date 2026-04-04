import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';

export const GET = withMasterAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  const { id: companyId } = params;

  const db = getReadDb();
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.level, u.points, u.streak,
           u.blocked, u.last_active, u.created_at,
           d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ?
    ORDER BY u.created_at DESC
  `).all(companyId);

  return NextResponse.json({ users });
});
