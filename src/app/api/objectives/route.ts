import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { objectiveRepo } from '@/repositories/objective.repository';
import { getReadDb } from '@/lib/db';

export const GET = withAuth(async (_req, context) => {
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(context.auth.userId) as { company_id: string } | undefined;
  if (!user?.company_id) return NextResponse.json({ objectives: [] });

  const objectives = objectiveRepo.getByCompanyWithProgress(user.company_id, context.auth.userId);
  return NextResponse.json({ objectives });
});
