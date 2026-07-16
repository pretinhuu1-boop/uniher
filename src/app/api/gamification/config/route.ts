import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { privacyReviewResponse } from '@/lib/privacy/api-response';
import { SAFE_GAMIFICATION_CONFIG_FIELDS } from '@/lib/gamification/containment';

const DEFAULTS = {
  active_themes: ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'],
  theme_order: ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'],
  hearts_enabled: 0,
  hearts_per_day: 5,
  hearts_refill_hours: 24,
} as const;

const configFieldSchemas = {
  active_themes: z.array(z.string()),
  theme_order: z.array(z.string()),
  hearts_enabled: z.number().int().min(0).max(1),
  hearts_per_day: z.number().int().min(1).max(20),
  hearts_refill_hours: z.number().int().min(1).max(168),
} as const;

const patchConfigSchema = z.object({
  active_themes: configFieldSchemas.active_themes.optional(),
  theme_order: configFieldSchemas.theme_order.optional(),
  hearts_enabled: configFieldSchemas.hearts_enabled.optional(),
  hearts_per_day: configFieldSchemas.hearts_per_day.optional(),
  hearts_refill_hours: configFieldSchemas.hearts_refill_hours.optional(),
}).strict();

function parseStoredArray(value: unknown, fallback: readonly string[]): readonly string[] {
  if (typeof value !== 'string') return [...fallback];
  try {
    const parsed = configFieldSchemas.active_themes.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [...fallback];
  } catch {
    return [...fallback];
  }
}

function parseStoredNumber(value: unknown, fallback: number, schema: z.ZodType<number>): number {
  const candidate = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

function parseConfig(config: Record<string, unknown> | undefined) {
  if (!config) return { ...DEFAULTS };
  return {
    active_themes: parseStoredArray(config.active_themes, DEFAULTS.active_themes),
    theme_order: parseStoredArray(config.theme_order, DEFAULTS.theme_order),
    hearts_enabled: parseStoredNumber(config.hearts_enabled, DEFAULTS.hearts_enabled, configFieldSchemas.hearts_enabled),
    hearts_per_day: parseStoredNumber(config.hearts_per_day, DEFAULTS.hearts_per_day, configFieldSchemas.hearts_per_day),
    hearts_refill_hours: parseStoredNumber(config.hearts_refill_hours, DEFAULTS.hearts_refill_hours, configFieldSchemas.hearts_refill_hours),
  };
}

export const GET = withAuth(async (_req, { auth }) => {
  await initDb();
  const columns = SAFE_GAMIFICATION_CONFIG_FIELDS.join(', ');
  const config = getReadDb().prepare(
    `SELECT ${columns} FROM gamification_config WHERE company_id = ?`,
  ).get(auth.companyId) as Record<string, unknown> | undefined;
  return NextResponse.json(parseConfig(config));
});

export const PATCH = withRole('admin', 'rh')(async (req, { auth }) => {
  await initDb();
  const parsed = patchConfigSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return privacyReviewResponse();

  const entries = Object.entries(parsed.data).filter((entry) => entry[1] !== undefined);
  if (entries.length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  await getWriteQueue().enqueue((db) => {
    const exists = db.prepare('SELECT 1 FROM gamification_config WHERE company_id = ?').get(auth.companyId);
    const values = Object.fromEntries(entries) as Record<string, unknown>;
    const serialized = {
      ...DEFAULTS,
      ...values,
      active_themes: JSON.stringify(values.active_themes ?? DEFAULTS.active_themes),
      theme_order: JSON.stringify(values.theme_order ?? DEFAULTS.theme_order),
    };

    if (!exists) {
      db.prepare(`
        INSERT INTO gamification_config (
          company_id, active_themes, theme_order, hearts_enabled, hearts_per_day, hearts_refill_hours
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        auth.companyId,
        serialized.active_themes,
        serialized.theme_order,
        serialized.hearts_enabled,
        serialized.hearts_per_day,
        serialized.hearts_refill_hours,
      );
      return;
    }

    const fields = entries.map(([key]) => `${key} = ?`);
    const parameters = entries.map(([key, value]) =>
      key === 'active_themes' || key === 'theme_order' ? JSON.stringify(value) : value,
    );
    db.prepare(`
      UPDATE gamification_config SET ${fields.join(', ')}, updated_at = datetime('now')
      WHERE company_id = ?
    `).run(...parameters, auth.companyId);
  });

  const columns = SAFE_GAMIFICATION_CONFIG_FIELDS.join(', ');
  const updated = getReadDb().prepare(
    `SELECT ${columns} FROM gamification_config WHERE company_id = ?`,
  ).get(auth.companyId) as Record<string, unknown>;
  return NextResponse.json(parseConfig(updated));
});
