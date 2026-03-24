import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const PatchSchema = z.object({
  reminder_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(5).optional(),
  mission_reminders: z.record(z.string(), z.boolean()).optional(),
  browser_enabled: z.boolean().optional(),
});

function getOrCreatePrefs(db: ReturnType<typeof getReadDb>, userId: string) {
  let row = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId) as any;
  if (!row) {
    // Return defaults without inserting (insert happens on first PATCH)
    row = {
      user_id: userId,
      reminder_times: '["08:00","18:00"]',
      mission_reminders: '{"check_in":true,"drink_water":true,"complete_challenge":true,"update_semaforo":true}',
      browser_enabled: 0,
    };
  }
  return {
    reminder_times: JSON.parse(row.reminder_times),
    mission_reminders: JSON.parse(row.mission_reminders),
    browser_enabled: row.browser_enabled === 1,
  };
}

export const GET = withAuth(async (_req: NextRequest, context) => {
  await initDb();
  const db = getReadDb();
  const prefs = getOrCreatePrefs(db, context.auth.userId);
  return NextResponse.json({ prefs });
});

export const PATCH = withAuth(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });

  const { reminder_times, mission_reminders, browser_enabled } = parsed.data;
  const userId = context.auth.userId;
  const db = getReadDb();
  const existing = getOrCreatePrefs(db, userId);

  const newTimes = reminder_times ?? existing.reminder_times;
  const newMissions = mission_reminders ?? existing.mission_reminders;
  const newBrowser = browser_enabled !== undefined ? browser_enabled : existing.browser_enabled;

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO notification_preferences (user_id, reminder_times, mission_reminders, browser_enabled, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        reminder_times = excluded.reminder_times,
        mission_reminders = excluded.mission_reminders,
        browser_enabled = excluded.browser_enabled,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(newTimes), JSON.stringify(newMissions), newBrowser ? 1 : 0);
  });

  return NextResponse.json({ success: true });
});
