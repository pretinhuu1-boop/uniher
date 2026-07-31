import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { quizSubmitSchema } from '@/lib/validation/schemas';
import * as quizRepo from '@/repositories/quiz.repository';

// POST /api/quiz/submit - salvar resultado do perfil de onboarding
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

    const archetype = quizRepo.getArchetypeByKey(input.archetypeKey);

    return NextResponse.json({
      success: true,
      archetypeKey: input.archetypeKey,
      archetype: archetype
        ? {
            key: archetype.key,
            name: archetype.name,
            description: archetype.description,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
