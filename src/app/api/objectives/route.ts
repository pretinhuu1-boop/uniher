import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { objectiveRepo } from '@/repositories/objective.repository';

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    const objectives = objectiveRepo.getByCompanyWithProgress(user.company_id, user.id);
    return NextResponse.json({ objectives });
  });
}
