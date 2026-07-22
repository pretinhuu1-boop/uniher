import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const MissionRemindersSchema = z.object({
  read_content: z.boolean().optional(),
  check_in: z.boolean().optional(),
  drink_water: z.boolean().optional(),
  complete_challenge: z.boolean().optional(),
}).strict();

const ReminderTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const ReminderTimesSchema = z.array(ReminderTimeSchema).max(5);

const PatchSchema = z.object({
  reminder_times: ReminderTimesSchema.optional(),
  mission_reminders: MissionRemindersSchema.optional(),
  browser_enabled: z.boolean().optional(),
}).strict();

type MissionReminders = z.infer<typeof MissionRemindersSchema>;

interface NotificationPreferencesRow {
  user_id: string;
  reminder_times: string;
  mission_reminders: string;
  browser_enabled: number;
}

const DEFAULT_MISSION_REMINDERS: MissionReminders = Object.freeze({
  check_in: true,
  drink_water: true,
  complete_challenge: true,
});
const DEFAULT_REMINDER_TIMES = Object.freeze(['08:00', '18:00'] as const);

function sanitizeReminderTimes(value: unknown): string[] {
  const parsed = ReminderTimesSchema.safeParse(value);
  return parsed.success ? parsed.data : [...DEFAULT_REMINDER_TIMES];
}

function sanitizeMissionReminders(value: unknown): MissionReminders {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const sanitized: MissionReminders = {};

  for (const key of ['read_content', 'check_in', 'drink_water', 'complete_challenge'] as const) {
    if (typeof record[key] === 'boolean') sanitized[key] = record[key];
  }

  return sanitized;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function getOrCreatePrefs(db: ReturnType<typeof getReadDb>, userId: string) {
  let row = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId) as NotificationPreferencesRow | undefined;
  if (!row) {
    // Return defaults without inserting (insert happens on first PATCH)
    row = {
      user_id: userId,
      reminder_times: '["08:00","18:00"]',
      mission_reminders: JSON.stringify(DEFAULT_MISSION_REMINDERS),
      browser_enabled: 0,
    };
  }
  return {
    reminder_times: sanitizeReminderTimes(parseJson(row.reminder_times)),
    mission_reminders: sanitizeMissionReminders(parseJson(row.mission_reminders)),
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
  const newMissions = mission_reminders
    ? { ...existing.mission_reminders, ...mission_reminders }
    : existing.mission_reminders;
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
