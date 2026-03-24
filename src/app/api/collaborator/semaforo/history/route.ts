import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb } from '@/lib/db';

interface HistoryRow {
  dimension: string;
  score: number;
  recorded_at: string;
}

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();

    const rows = db.prepare(`
      SELECT dimension, score, recorded_at
      FROM health_scores
      WHERE user_id = ?
      ORDER BY recorded_at DESC
      LIMIT 30
    `).all(auth.userId) as HistoryRow[];

    // Group by dimension
    const grouped: Record<string, { score: number; recorded_at: string }[]> = {};
    for (const row of rows) {
      if (!grouped[row.dimension]) grouped[row.dimension] = [];
      grouped[row.dimension].push({ score: row.score, recorded_at: row.recorded_at });
    }

    return NextResponse.json(grouped);
  } catch (error) {
    return handleApiError(error);
  }
});
