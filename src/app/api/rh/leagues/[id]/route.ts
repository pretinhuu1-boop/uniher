/**
 * PATCH /api/rh/leagues/[id]   — update or toggle active
 * DELETE /api/rh/leagues/[id]  — delete
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
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
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }
  const { id } = await context.params;

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
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, userId, companyId, () => {
      const league = db.prepare(`
        SELECT id
        FROM custom_leagues
        WHERE id = ? AND company_id = ?
      `).get(id, companyId);
      if (!league) return false;

      const updated = db.prepare(`
        UPDATE custom_leagues
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).run(...values, id, companyId);
      return updated.changes === 1;
    })
  ), 'update RH league', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (!outcome.value) {
    return NextResponse.json({ error: 'Liga não encontrada ou alterada' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
});

export const DELETE = withRole('rh')(async (_req, context) => {
  await initDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }
  const { id } = await context.params;

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, userId, companyId, () => {
      const league = db.prepare(`
        SELECT id
        FROM custom_leagues
        WHERE id = ? AND company_id = ?
      `).get(id, companyId);
      if (!league) return false;

      const deleted = db.prepare(`
        DELETE FROM custom_leagues
        WHERE id = ? AND company_id = ?
      `).run(id, companyId);
      return deleted.changes === 1;
    })
  ), 'delete RH league', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (!outcome.value) {
    return NextResponse.json({ error: 'Liga não encontrada ou alterada' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
});
