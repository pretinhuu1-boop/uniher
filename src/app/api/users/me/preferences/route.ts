import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { privacyReviewResponse } from '@/lib/privacy/api-response';
import { AppError, handleApiError } from '@/lib/errors';

const SUPPORTER_NAME_KEY = 'privacy_community_supporter_name';
const SUPPORTER_NAME_AUDIT_ACTION = 'user_preference_update';

const VALID_KEYS = [
  'notif_badges',
  'notif_campaigns',
  'notif_challenges',
  'notif_email',
  'first_access_tour_completed',
  'privacy_ranking',
  'privacy_profile',
  'privacy_analytics',
  SUPPORTER_NAME_KEY,
] as const;

const PatchSchema = z.object({
  preferences: z.record(z.string(), z.string()).superRefine((preferences, ctx) => {
    for (const key of Object.keys(preferences)) {
      if (!VALID_KEYS.includes(key as (typeof VALID_KEYS)[number])) {
        ctx.addIssue({
          code: 'custom',
          message: `Preferencia nao suportada: ${key}`,
          path: [key],
        });
        continue;
      }
      if (key === SUPPORTER_NAME_KEY && !['0', '1'].includes(preferences[key])) {
        ctx.addIssue({
          code: 'custom',
          message: `Valor invalido para ${SUPPORTER_NAME_KEY}`,
          path: [key],
        });
      }
    }
  }),
});

export const GET = withAuth(async (_req: NextRequest, context) => {
  await initDb();
  const db = getReadDb();
  const rows = db.prepare(
    'SELECT pref_key, pref_value FROM user_preferences WHERE user_id = ?'
  ).all(context.auth.userId) as { pref_key: string; pref_value: string }[];

  const prefs: Record<string, string> = { [SUPPORTER_NAME_KEY]: '0' };
  for (const row of rows) {
    if (row.pref_key === 'privacy_ranking') continue;
    prefs[row.pref_key] = row.pref_value;
  }

  return NextResponse.json({ preferences: prefs });
});

export const PATCH = withAuth(async (req: NextRequest, context) => {
  try {
    await initDb();
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
    }

    const { preferences } = parsed.data;
    if (Object.prototype.hasOwnProperty.call(preferences, 'privacy_ranking')) {
      return privacyReviewResponse();
    }
    const userId = context.auth.userId;
    const entries = Object.entries(preferences);

    if (entries.length === 0) {
      return NextResponse.json({ success: true });
    }

    const now = new Date().toISOString();
    const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')?.trim()
      || null;
    const wq = getWriteQueue();
    await wq.enqueue((db) => db.transaction(() => {
      const actor = db.prepare(`
        SELECT id, email, role
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
          AND COALESCE(blocked, 0) = 0
          AND COALESCE(approved, 0) = 1
      `).get(userId) as { id: string; email: string; role: string } | undefined;
      if (!actor) {
        throw new AppError('Usuario nao autorizado para alterar preferencias', 403, 'PREFERENCE_ACTOR_FORBIDDEN');
      }

      const upsert = db.prepare(`
        INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, pref_key) DO UPDATE SET
          pref_value = excluded.pref_value,
          updated_at = excluded.updated_at
      `);
      const currentPreference = db.prepare(`
        SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = ?
      `);
      const audit = db.prepare(`
        INSERT INTO audit_logs (
          id, actor_id, actor_email, actor_role, action, entity_type,
          entity_id, details, ip, created_at
        ) VALUES (
          lower(hex(randomblob(16))), ?, ?, ?, ?, 'user_preference', ?, ?, ?, ?
        )
      `);

      for (const [key, value] of entries) {
        if (key !== SUPPORTER_NAME_KEY) {
          upsert.run(userId, key, value, now);
          continue;
        }

        const current = currentPreference.get(userId, key) as { pref_value: string } | undefined;
        const previousValue = current?.pref_value ?? '0';
        if (previousValue === value) continue;

        upsert.run(userId, key, value, now);
        audit.run(
          actor.id,
          actor.email,
          actor.role,
          SUPPORTER_NAME_AUDIT_ACTION,
          actor.id,
          JSON.stringify({ key: SUPPORTER_NAME_KEY, timestamp: now }),
          requestIp,
          now,
        );
      }
    }).immediate());

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
