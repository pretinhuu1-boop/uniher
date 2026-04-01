import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { createChallengeSchema, updateProgressSchema } from '@/lib/validation/schemas';
import * as collabService from '@/services/collaborator.service';
import * as activityService from '@/services/activity.service';
import * as challengeRepo from '@/repositories/challenge.repository';
import { getReadDb } from '@/lib/db';

// GET /api/collaborator/challenges - listar desafios
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const data = collabService.getCollaboratorChallenges(auth.userId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/collaborator/challenges - criar desafio customizado
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(auth.userId) as { role?: string } | undefined;
    if (!user || (user.role !== 'rh' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Apenas RH/Admin podem criar desafios.' }, { status: 403 });
    }
    const body = await req.json();
    const input = createChallengeSchema.parse(body);

    const challenge = await challengeRepo.createUserChallenge({
      userId: auth.userId,
      title: input.title,
      description: input.description,
      category: input.category,
      points: input.points,
      totalSteps: input.totalSteps,
      deadline: input.deadline,
    });

    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});

// PATCH /api/collaborator/challenges - atualizar progresso
export const PATCH = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const { challengeId, increment } = body;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId é obrigatório' }, { status: 400 });
    }

    // Ownership check: verify user owns this user_challenge entry
    const userChallenge = challengeRepo.getUserChallenge(auth.userId, challengeId);
    if (!userChallenge) {
      return NextResponse.json({ error: 'Desafio não encontrado' }, { status: 404 });
    }

    const result = await activityService.updateChallengeProgress(auth.userId, challengeId, increment || 1);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
});
