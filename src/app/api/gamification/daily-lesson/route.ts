import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { addPoints } from '@/services/gamification.service';

// GET /api/gamification/daily-lesson - Returns today's lesson for logged-in user
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const userId = auth.userId;
    const companyId = auth.companyId;
    const today = new Date().toISOString().split('T')[0];

    // Determine user's current week/day based on progress
    const completedCount = (db.prepare(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND completed = 1`
    ).get(userId) as { count: number }).count;

    // Current week and day_of_week (1-indexed)
    const dayOfWeek = new Date().getDay() || 7; // 1=Mon, 7=Sun
    const currentWeek = Math.floor(completedCount / 7) + 1;

    // Try company-specific lessons first, then global (company_id IS NULL)
    let lesson = db.prepare(
      `SELECT dl.*,
              ulp.completed as user_completed,
              ulp.score as user_score,
              ulp.xp_earned as user_xp_earned,
              ulp.completed_at
       FROM daily_lessons dl
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
       WHERE dl.company_id = ? AND dl.week_number = ? AND dl.day_of_week = ? AND dl.active = 1
       ORDER BY dl.order_index ASC
       LIMIT 1`
    ).get(userId, companyId, currentWeek, dayOfWeek) as Record<string, unknown> | undefined;

    if (!lesson) {
      // Fallback to global lessons
      lesson = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE dl.company_id IS NULL AND dl.week_number = ? AND dl.day_of_week = ? AND dl.active = 1
         ORDER BY dl.order_index ASC
         LIMIT 1`
      ).get(userId, currentWeek, dayOfWeek) as Record<string, unknown> | undefined;
    }

    if (!lesson) {
      // Try any unfinished lesson for today's day_of_week
      lesson = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE (dl.company_id = ? OR dl.company_id IS NULL)
               AND dl.day_of_week = ? AND dl.active = 1
               AND (ulp.completed IS NULL OR ulp.completed = 0)
         ORDER BY dl.week_number ASC, dl.order_index ASC
         LIMIT 1`
      ).get(userId, companyId, dayOfWeek) as Record<string, unknown> | undefined;
    }

    if (!lesson) {
      // Final fallback: any unfinished lesson regardless of day (weekends, holidays, etc.)
      lesson = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE (dl.company_id = ? OR dl.company_id IS NULL)
               AND dl.active = 1
               AND (ulp.completed IS NULL OR ulp.completed = 0)
         ORDER BY dl.week_number ASC, dl.day_of_week ASC, dl.order_index ASC
         LIMIT 1`
      ).get(userId, companyId) as Record<string, unknown> | undefined;
    }

    // Get gamification config for hearts info
    const config = db.prepare(
      'SELECT hearts_enabled, xp_lesson FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { hearts_enabled: number; xp_lesson: number } | undefined;

    // Get hearts if enabled
    let hearts = null;
    if (config?.hearts_enabled) {
      hearts = db.prepare('SELECT hearts, max_hearts FROM user_hearts WHERE user_id = ?').get(userId) as { hearts: number; max_hearts: number } | undefined;
    }

    // Get today's completion count
    const todayCompleted = (db.prepare(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND completed = 1 AND DATE(completed_at) = ?`
    ).get(userId, today) as { count: number }).count;

    return NextResponse.json({
      lesson: lesson ? {
        ...lesson,
        content_json: lesson.content_json ? JSON.parse(lesson.content_json as string) : null,
      } : null,
      progress: {
        totalCompleted: completedCount,
        currentWeek,
        todayCompleted,
      },
      hearts: hearts ? { current: hearts.hearts, max: hearts.max_hearts } : null,
      heartsEnabled: !!config?.hearts_enabled,
      xpReward: config?.xp_lesson ?? 20,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

const completeLessonSchema = z.object({
  lessonId: z.string().min(1, 'lessonId obrigatorio'),
  score: z.number().min(0).max(100).optional().default(100),
  wrongAnswers: z.number().min(0).optional().default(0),
});

// POST /api/gamification/daily-lesson - Mark lesson as completed
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = completeLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { lessonId, score, wrongAnswers } = parsed.data;
    const userId = auth.userId;
    const companyId = auth.companyId;
    const db = getReadDb();

    // Verify lesson exists
    const lesson = db.prepare(
      'SELECT * FROM daily_lessons WHERE id = ? AND active = 1'
    ).get(lessonId) as { id: string; company_id: string | null; xp_reward: number } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Licao nao encontrada' }, { status: 404 });
    }

    // Check company isolation
    if (lesson.company_id && lesson.company_id !== companyId) {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }

    // Check if already completed
    const existing = db.prepare(
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?'
    ).get(userId, lessonId) as { completed: number } | undefined;

    if (existing?.completed) {
      return NextResponse.json({ error: 'Licao ja completada', alreadyCompleted: true }, { status: 409 });
    }

    // Check hearts (if enabled and wrong answers)
    const config = db.prepare(
      'SELECT * FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { hearts_enabled: number; xp_lesson: number; hearts_refill_hours: number } | undefined;

    if (config?.hearts_enabled && wrongAnswers > 0) {
      const userHearts = db.prepare('SELECT * FROM user_hearts WHERE user_id = ?').get(userId) as { hearts: number } | undefined;
      if (userHearts && userHearts.hearts <= 0) {
        return NextResponse.json({ error: 'Sem vidas disponiveis. Aguarde a recarga.', noHearts: true }, { status: 422 });
      }

      // Deduct hearts for wrong answers
      const writeQueue = getWriteQueue();
      await writeQueue.enqueue((wdb) => {
        const deduction = Math.min(wrongAnswers, userHearts?.hearts ?? 5);
        wdb.prepare('UPDATE user_hearts SET hearts = MAX(0, hearts - ?) WHERE user_id = ?').run(deduction, userId);
      });
    }

    // Record completion
    const xpReward = config?.xp_lesson ?? lesson.xp_reward;
    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      if (existing) {
        wdb.prepare(
          `UPDATE user_lesson_progress SET completed = 1, score = ?, xp_earned = ?, completed_at = datetime('now') WHERE user_id = ? AND lesson_id = ?`
        ).run(score, xpReward, userId, lessonId);
      } else {
        wdb.prepare(
          `INSERT INTO user_lesson_progress (id, user_id, lesson_id, completed, score, xp_earned, completed_at)
           VALUES (?, ?, ?, 1, ?, ?, datetime('now'))`
        ).run(nanoid(), userId, lessonId, score, xpReward);
      }
    });

    // Award XP
    const result = await addPoints(userId, xpReward, 'lesson', lessonId);

    return NextResponse.json({
      success: true,
      xpEarned: xpReward,
      newPoints: result.newPoints,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      score,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
