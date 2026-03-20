import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { quizSubmitSchema } from '@/lib/validation/schemas';
import * as quizRepo from '@/repositories/quiz.repository';

// GET /api/quiz - buscar resultado do quiz do usuario
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const result = quizRepo.getQuizResult(auth.userId);
    if (!result) {
      return NextResponse.json(null);
    }

    const archetype = result.archetype_id
      ? quizRepo.getArchetypeByKey(result.archetype_id)
      : null;

    return NextResponse.json({
      archetypeKey: archetype?.key || null,
      answers: JSON.parse(result.answers_json),
      createdAt: result.created_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/quiz - salvar resultado do quiz
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const input = quizSubmitSchema.parse(body);

    await quizRepo.saveQuizResult({
      userId: auth.userId,
      archetypeKey: input.archetypeKey,
      answers: input.answers,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
