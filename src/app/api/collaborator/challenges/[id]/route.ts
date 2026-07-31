import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { updateProgressSchema } from '@/lib/validation/schemas';
import { updateChallengeProgress } from '@/services/activity.service';

// PATCH /api/collaborator/challenges/[id] - atualizar progresso
export const PATCH = withAuth(async (req, { auth, params }) => {
  try {
    await initDb();
    const { id: challengeId } = await params;

    const body = await req.json();
    const input = updateProgressSchema.parse(body);

    const updated = await updateChallengeProgress(
      auth.userId,
      challengeId,
      input.increment,
      {
        companyId: auth.companyId,
        progressPoints: 0,
        creditMode: 'gamification',
      }
    );

    return NextResponse.json({
      id: updated.id,
      progress: updated.progress,
      total: updated.total,
      status: updated.status,
      completedAt: updated.completedAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
