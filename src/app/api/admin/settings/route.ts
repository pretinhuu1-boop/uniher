import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import * as userRepo from '@/repositories/user.repository';
import { verifyPassword } from '@/lib/auth/password';

const ALLOWED_KEYS = [
  'app_name',
  'app_logo_url',
  'primary_color',
  'secondary_color',
  'accent_color',
  'support_email',
  'support_phone',
  'auto_backup_enabled',
  'auto_backup_hour',
] as const;

type SettingKey = (typeof ALLOWED_KEYS)[number];

export const GET = withMasterAdmin(async (_req: NextRequest) => {
  await initDb();
  const db = getReadDb();
  const rows = db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json({ settings });
});

const patchSchema = z.object({
  app_name: z.string().min(1).max(80).optional(),
  app_logo_url: z.string().url().max(500).or(z.literal('')).optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  support_email: z.string().email().max(200).or(z.literal('')).optional(),
  support_phone: z.string().max(30).optional(),
  auto_backup_enabled: z.enum(['0', '1']).optional(),
  auto_backup_hour: z.string().regex(/^(?:[01]?\d|2[0-3])$/).optional(),
  master_password: z.string().min(1).max(200).optional(),
});

export const PATCH = withMasterAdmin(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const wq = getWriteQueue();
  const { master_password, ...rest } = parsed.data;
  const updates = Object.entries(rest).filter(([, v]) => v !== undefined) as [SettingKey, string][];

  if (updates.length === 0) return NextResponse.json({ success: true });

  const requestedEnabled = parsed.data.auto_backup_enabled;
  if (requestedEnabled !== undefined) {
    const db = getReadDb();
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ? LIMIT 1').get('auto_backup_enabled') as { value?: string } | undefined;
    const currentEnabled = row?.value === '0' ? '0' : '1';
    const isChangingEnabled = requestedEnabled !== currentEnabled;

    if (isChangingEnabled) {
      if (!master_password) {
        return NextResponse.json(
          { error: 'Para ativar ou desativar backup automático, informe a senha do master.' },
          { status: 400 }
        );
      }

      const actor = userRepo.getUserById(context.auth.userId);
      if (!actor) {
        return NextResponse.json({ error: 'Usuária não encontrada.' }, { status: 401 });
      }

      const validPassword = await verifyPassword(master_password, actor.password_hash);
      if (!validPassword) {
        return NextResponse.json({ error: 'Senha do master inválida.' }, { status: 403 });
      }
    }
  }

  await wq.enqueue((db) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    for (const [key, value] of updates) {
      stmt.run(key, value);
    }
  });

  const ip = req.headers.get('x-forwarded-for') ?? undefined;
  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'system_settings_update',
    entityType: 'system',
    entityLabel: 'Identidade Visual',
    details: Object.fromEntries(updates),
    ip,
  });

  return NextResponse.json({ success: true });
});
