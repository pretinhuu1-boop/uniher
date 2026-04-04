import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const VALID_KEYS = [
  'notif_badges',
  'notif_campaigns',
  'notif_challenges',
  'notif_email',
  'first_access_tour_completed',
  'privacy_ranking',
  'privacy_profile',
  'privacy_analytics',
] as const;

const PatchSchema = z.object({
  preferences: z.record(
    z.enum(VALID_KEYS),
    z.string()
  ),
});

export const GET = withAuth(async (_req: NextRequest, context) => {
  await initDb();
  const db = getReadDb();
  const rows = db.prepare(
    'SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?'
  ).all(context.auth.userId) as { pref_key: string; pref_value: string }[];

  const prefs: Record<string, string> = {};
  for (const row of rows) {
    prefs[row.pref_key] = row.pref_value;
  }

  return NextResponse.json({ preferences: prefs });
});

export const PATCH = withAuth(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
  }

  const { preferences } = parsed.data;
  const userId = context.auth.userId;
  const entries = Object.entries(preferences);

  if (entries.length === 0) {
    return NextResponse.json({ success: true });
  }

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    const stmt = db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, pref_key) DO UPDATE SET
        pref_value = excluded.pref_value,
        updated_at = excluded.updated_at
    `);

    const tx = db.transaction(() => {
      for (const [key, value] of entries) {
        stmt.run(userId, key, value);
      }
    });
    tx();
  });

  return NextResponse.json({ success: true });
});
