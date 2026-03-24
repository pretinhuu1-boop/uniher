import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getQuizResult, getArchetypeByKey } from '@/repositories/quiz.repository';
import { getReadDb } from '@/lib/db';

// GET /api/collaborator/archetype - retorna arquétipo do quiz da usuária
export const GET = withAuth(async (_req, { auth }) => {
  try {
    const quizResult = getQuizResult(auth.userId);

    if (!quizResult || !quizResult.archetype_id) {
      return NextResponse.json({ archetype: null });
    }

    // Get archetype by id (quiz_results stores archetype_id, not key)
    const db = getReadDb();
    const archetype = db.prepare(
      'SELECT * FROM archetypes WHERE id = ?'
    ).get(quizResult.archetype_id) as {
      id: string; key: string; name: string; description: string;
      base_scores: string; growth_30: string; growth_60: string; growth_90: string;
    } | undefined;

    if (!archetype) {
      return NextResponse.json({ archetype: null });
    }

    return NextResponse.json({
      archetype: {
        key: archetype.key,
        name: archetype.name,
        description: archetype.description,
        baseScores: JSON.parse(archetype.base_scores || '{}'),
        growthProjections: {
          '30': JSON.parse(archetype.growth_30 || '{}'),
          '60': JSON.parse(archetype.growth_60 || '{}'),
          '90': JSON.parse(archetype.growth_90 || '{}'),
        },
        assignedAt: quizResult.created_at,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
