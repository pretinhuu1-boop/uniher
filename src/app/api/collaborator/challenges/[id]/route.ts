import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { updateProgressSchema } from '@/lib/validation/schemas';
import * as challengeRepo from '@/repositories/challenge.repository';
import { addPoints } from '@/services/gamification.service';

// PATCH /api/collaborator/challenges/[id] - atualizar progresso
export const PATCH = withAuth(async (req, { auth, params }) => {
  try {
    await initDb();
    const { id: challengeId } = await params;

    const body = await req.json();
    const input = updateProgressSchema.parse(body);

    const existing = challengeRepo.getUserChallenge(auth.userId, challengeId);
    if (!existing) {
      throw new NotFoundError('Desafio não encontrado');
    }

    const newProgress = (existing.progress ?? 0) + (input.increment ?? 1);
    const isCompleted = newProgress >= (existing.total_steps ?? 1);

    const updated = await challengeRepo.updateUserChallenge(
      auth.userId,
      challengeId,
      {
        progress: newProgress,
        status: isCompleted ? 'completed' : 'active',
        ...(isCompleted ? { completedAt: new Date().toISOString() } : {}),
      }
    );

    // Se completou agora (era active, agora completed)
    if (existing.status === 'active' && updated.status === 'completed') {
      await addPoints(auth.userId, updated.points, 'challenge', challengeId);
    }

    return NextResponse.json({
      id: updated.id,
      progress: updated.progress,
      total: updated.total_steps,
      status: updated.status,
      completedAt: updated.completed_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
