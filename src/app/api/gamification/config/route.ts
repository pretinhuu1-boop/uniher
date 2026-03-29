import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth, withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';

const DEFAULTS = {
  xp_checkin: 50,
  xp_lesson: 20,
  xp_quiz: 30,
  xp_challenge: 40,
  xp_exam: 100,
  streak_notifications: 1,
  streak_min_days: 3,
  hearts_enabled: 0,
  hearts_per_day: 5,
  hearts_refill_hours: 24,
  league_enabled: 1,
  league_anonymous: 0,
  daily_xp_goal: 50,
  active_themes: '["hidratacao","sono","prevencao","nutricao","mental","ciclo"]',
  theme_order: '["hidratacao","sono","prevencao","nutricao","mental","ciclo"]',
};

// GET /api/gamification/config - Returns gamification config for user's company
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const companyId = auth.companyId;

    const config = db.prepare(
      'SELECT * FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as Record<string, unknown> | undefined;

    if (!config) {
      return NextResponse.json({
        company_id: companyId,
        ...DEFAULTS,
        active_themes: JSON.parse(DEFAULTS.active_themes),
        theme_order: JSON.parse(DEFAULTS.theme_order),
        isDefault: true,
      });
    }

    return NextResponse.json({
      ...config,
      active_themes: config.active_themes ? JSON.parse(config.active_themes as string) : JSON.parse(DEFAULTS.active_themes),
      theme_order: config.theme_order ? JSON.parse(config.theme_order as string) : JSON.parse(DEFAULTS.theme_order),
      isDefault: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

const patchConfigSchema = z.object({
  xp_checkin: z.number().min(0).max(1000).optional(),
  xp_lesson: z.number().min(0).max(1000).optional(),
  xp_quiz: z.number().min(0).max(1000).optional(),
  xp_challenge: z.number().min(0).max(1000).optional(),
  xp_exam: z.number().min(0).max(1000).optional(),
  streak_notifications: z.number().min(0).max(1).optional(),
  streak_min_days: z.number().min(1).max(365).optional(),
  hearts_enabled: z.number().min(0).max(1).optional(),
  hearts_per_day: z.number().min(1).max(20).optional(),
  hearts_refill_hours: z.number().min(1).max(168).optional(),
  league_enabled: z.number().min(0).max(1).optional(),
  league_anonymous: z.number().min(0).max(1).optional(),
  daily_xp_goal: z.number().min(10).max(500).optional(),
  active_themes: z.array(z.string()).optional(),
  theme_order: z.array(z.string()).optional(),
});

// PATCH /api/gamification/config - Admin updates gamification config
export const PATCH = withRole('admin', 'rh')(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = patchConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const companyId = auth.companyId;
    const db = getReadDb();
    const existing = db.prepare('SELECT company_id FROM gamification_config WHERE company_id = ?').get(companyId);

    const writeQueue = getWriteQueue();

    if (!existing) {
      // Create new config with defaults + overrides
      const data = { ...DEFAULTS, ...parsed.data };
      const activeThemes = Array.isArray(data.active_themes) ? JSON.stringify(data.active_themes) : data.active_themes;
      const themeOrder = Array.isArray(data.theme_order) ? JSON.stringify(data.theme_order) : data.theme_order;

      await writeQueue.enqueue((wdb) => {
        wdb.prepare(
          `INSERT INTO gamification_config (company_id, xp_checkin, xp_lesson, xp_quiz, xp_challenge, xp_exam,
           streak_notifications, streak_min_days, hearts_enabled, hearts_per_day, hearts_refill_hours,
           league_enabled, league_anonymous, daily_xp_goal, active_themes, theme_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          companyId, data.xp_checkin, data.xp_lesson, data.xp_quiz, data.xp_challenge, data.xp_exam,
          data.streak_notifications, data.streak_min_days, data.hearts_enabled, data.hearts_per_day,
          data.hearts_refill_hours, data.league_enabled, data.league_anonymous, data.daily_xp_goal,
          activeThemes, themeOrder
        );
      });
    } else {
      // Dynamic update
      const fields: string[] = [];
      const values: unknown[] = [];

      for (const [key, val] of Object.entries(parsed.data)) {
        if (val === undefined) continue;
        if (key === 'active_themes' || key === 'theme_order') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(val));
        } else {
          fields.push(`${key} = ?`);
          values.push(val);
        }
      }

      if (fields.length === 0) {
        return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
      }

      fields.push("updated_at = datetime('now')");
      values.push(companyId);

      await writeQueue.enqueue((wdb) => {
        wdb.prepare(`UPDATE gamification_config SET ${fields.join(', ')} WHERE company_id = ?`).run(...values);
      });
    }

    // Return updated config
    const updated = db.prepare('SELECT * FROM gamification_config WHERE company_id = ?').get(companyId) as Record<string, unknown>;

    return NextResponse.json({
      ...updated,
      active_themes: updated.active_themes ? JSON.parse(updated.active_themes as string) : [],
      theme_order: updated.theme_order ? JSON.parse(updated.theme_order as string) : [],
    });
  } catch (error) {
    return handleApiError(error);
  }
});
