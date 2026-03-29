import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb } from '@/lib/db';

interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  theme: string;
  xp_reward: number;
  duration_seconds: number;
  week_number: number;
  day_of_week: number;
  order_index: number;
  user_completed: number | null;
  user_score: number | null;
  user_xp_earned: number | null;
  completed_at: string | null;
}

interface WeekGroup {
  weekNumber: number;
  theme: string;
  lessons: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    theme: string;
    xpReward: number;
    durationSeconds: number;
    dayOfWeek: number;
    completed: boolean;
    score: number | null;
    xpEarned: number | null;
    completedAt: string | null;
  }[];
  completedCount: number;
  totalLessons: number;
  isComplete: boolean;
}

// GET /api/gamification/journey - Returns user's full journey map
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const userId = auth.userId;
    const companyId = auth.companyId;

    // Get all lessons with user progress (company-specific + global)
    const lessons = db.prepare(
      `SELECT dl.id, dl.title, dl.description, dl.type, dl.theme, dl.xp_reward,
              dl.duration_seconds, dl.week_number, dl.day_of_week, dl.order_index,
              ulp.completed as user_completed, ulp.score as user_score,
              ulp.xp_earned as user_xp_earned, ulp.completed_at
       FROM daily_lessons dl
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
       WHERE (dl.company_id = ? OR dl.company_id IS NULL) AND dl.active = 1
       ORDER BY dl.week_number ASC, dl.day_of_week ASC, dl.order_index ASC`
    ).all(userId, companyId) as LessonRow[];

    // Group by week
    const weeksMap = new Map<number, WeekGroup>();

    for (const lesson of lessons) {
      if (!weeksMap.has(lesson.week_number)) {
        weeksMap.set(lesson.week_number, {
          weekNumber: lesson.week_number,
          theme: lesson.theme,
          lessons: [],
          completedCount: 0,
          totalLessons: 0,
          isComplete: false,
        });
      }

      const week = weeksMap.get(lesson.week_number)!;
      const completed = lesson.user_completed === 1;

      week.lessons.push({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        theme: lesson.theme,
        xpReward: lesson.xp_reward,
        durationSeconds: lesson.duration_seconds,
        dayOfWeek: lesson.day_of_week,
        completed,
        score: completed ? lesson.user_score : null,
        xpEarned: completed ? lesson.user_xp_earned : null,
        completedAt: lesson.completed_at,
      });

      week.totalLessons++;
      if (completed) week.completedCount++;
    }

    // Finalize weeks
    const weeks: WeekGroup[] = [];
    for (const week of weeksMap.values()) {
      week.isComplete = week.completedCount === week.totalLessons && week.totalLessons > 0;
      weeks.push(week);
    }

    // Calculate overall progress
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter(l => l.user_completed === 1).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Determine current week (first incomplete week)
    const currentWeek = weeks.find(w => !w.isComplete)?.weekNumber ?? (weeks.length > 0 ? weeks[weeks.length - 1].weekNumber : 1);

    // Get gamification config for theme info
    const config = db.prepare(
      'SELECT active_themes, theme_order FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { active_themes: string; theme_order: string } | undefined;

    const activeThemes = config?.active_themes ? JSON.parse(config.active_themes) : ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'];
    const themeOrder = config?.theme_order ? JSON.parse(config.theme_order) : activeThemes;

    return NextResponse.json({
      weeks,
      currentWeek,
      progress: {
        totalLessons,
        completedLessons,
        progressPercentage,
        totalWeeks: weeks.length,
        completedWeeks: weeks.filter(w => w.isComplete).length,
      },
      themes: {
        active: activeThemes,
        order: themeOrder,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
