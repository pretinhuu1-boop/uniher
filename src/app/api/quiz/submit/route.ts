import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { quizSubmitSchema } from '@/lib/validation/schemas';
import * as quizRepo from '@/repositories/quiz.repository';
import * as healthRepo from '@/repositories/health-score.repository';

// POST /api/quiz/submit - salvar resultado e calcular scores iniciais
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

    // Salvar health scores iniciais baseados nas respostas
    if (Array.isArray(input.answers) && input.answers.length >= 6) {
      const dimensions = ['prevencao', 'sono', 'energia', 'saude_mental', 'habitos', 'engajamento'];
      for (let i = 0; i < Math.min(input.answers.length, 6); i++) {
        const score = Number(input.answers[i]);
        if (!isNaN(score)) {
          await healthRepo.recordHealthScore(auth.userId, dimensions[i], score);
        }
      }
    }

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
