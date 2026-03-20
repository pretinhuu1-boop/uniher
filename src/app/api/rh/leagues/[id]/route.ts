/**
 * PATCH /api/rh/leagues/[id]   — update or toggle active
 * DELETE /api/rh/leagues/[id]  — delete
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(300).optional().nullable(),
  icon: z.string().max(4).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = withRole('rh')(async (req, context) => {
  await initDb();
  const userId = context.auth.userId;
  const { id } = await context.params;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  const league = db.prepare('SELECT * FROM custom_leagues WHERE id = ?').get(id) as any;

  if (!league) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });
  if (league.company_id !== user?.company_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const fields: string[] = [];
  const values: any[] = [];
  const d = parsed.data;
  if (d.name !== undefined) { fields.push('name = ?'); values.push(d.name); }
  if ('description' in d) { fields.push('description = ?'); values.push(d.description ?? null); }
  if (d.icon !== undefined) { fields.push('icon = ?'); values.push(d.icon); }
  if (d.color !== undefined) { fields.push('color = ?'); values.push(d.color); }
  if (d.is_active !== undefined) { fields.push('is_active = ?'); values.push(d.is_active ? 1 : 0); }

  if (!fields.length) return NextResponse.json({ error: 'Nenhum campo' }, { status: 400 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`UPDATE custom_leagues SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withRole('rh')(async (_req, context) => {
  await initDb();
  const userId = context.auth.userId;
  const { id } = await context.params;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  const league = db.prepare('SELECT company_id FROM custom_leagues WHERE id = ?').get(id) as any;

  if (!league) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  if (league.company_id !== user?.company_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('DELETE FROM custom_leagues WHERE id = ?').run(id);
  });
  return NextResponse.json({ success: true });
});
