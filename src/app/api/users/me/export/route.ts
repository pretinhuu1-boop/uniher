import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { RateLimitError } from '@/lib/errors';
import { getReadDb } from '@/lib/db';

// Simple in-memory rate limit: 1 export per hour per user
const exportTimestamps = new Map<string, number>();

// GET /api/users/me/export - exportar todos os dados da usuária (LGPD)
export const GET = withAuth(async (_req, { auth }) => {
  try {
    const now = Date.now();
    const lastExport = exportTimestamps.get(auth.userId);
    if (lastExport && now - lastExport < 3600_000) {
      throw new RateLimitError('Você já exportou seus dados recentemente. Tente novamente em 1 hora.');
    }

    const db = getReadDb();
    const userId = auth.userId;

    // Collect all user data
    const user = db.prepare(
      'SELECT id, name, email, role, department_id, company_id, points, level, league, avatar_url, created_at, updated_at FROM users WHERE id = ?'
    ).get(userId);

    const healthScores = db.prepare(
      'SELECT dimension, score, recorded_at FROM health_scores WHERE user_id = ? ORDER BY recorded_at DESC'
    ).all(userId);

    const quizResults = db.prepare(
      'SELECT id, archetype_id, answers_json, created_at FROM quiz_results WHERE user_id = ?'
    ).all(userId);

    const badges = db.prepare(
      'SELECT ub.badge_id, b.name, b.description, ub.unlocked_at FROM user_badges ub LEFT JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ?'
    ).all(userId);

    const challenges = db.prepare(
      'SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at FROM user_challenges uc LEFT JOIN challenges c ON c.id = uc.challenge_id WHERE uc.user_id = ?'
    ).all(userId);

    const notifications = db.prepare(
      'SELECT id, type, title, message, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'
    ).all(userId);

    const activityLog = db.prepare(
      'SELECT action, details, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 500'
    ).all(userId);

    const missionLogs = db.prepare(
      'SELECT mission_key, payload, xp_earned, completed_at FROM mission_logs WHERE user_id = ? ORDER BY completed_at DESC LIMIT 500'
    ).all(userId);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      healthScores,
      quizResults,
      badges,
      challenges,
      notifications,
      activityLog,
      missionLogs,
    };

    exportTimestamps.set(auth.userId, now);

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="uniher-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
