import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
import { z } from 'zod';

const UpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
  target_value: z.number().int().min(1).max(100000).optional(),
  reward_type: z.enum(['points', 'badge', 'custom']).optional(),
  reward_points: z.number().int().min(0).max(10000).optional(),
  reward_badge_id: z.string().min(1).max(100).optional(),
  reward_custom: z.string().max(300).optional(),
  starts_at: z.string().datetime({ offset: true }).nullable().optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_active: z.literal(0).optional(),
});

function deniedResponse() {
  return NextResponse.json(
    { error: 'Autorizacao do RH expirou' },
    { status: 409 },
  );
}

export const PATCH = withRole('rh', 'admin')(async (
  req: NextRequest,
  context,
) => {
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json(
      { error: 'Empresa ou papel de gestao nao encontrado' },
      { status: 400 },
    );
  }

  const id = (await context.params).id;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 422 },
    );
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, companyId, () => {
      const objective = db.prepare(`
        SELECT id, title
        FROM company_objectives
        WHERE id = ? AND company_id = ? AND is_active = 1
      `).get(id, companyId) as { id: string; title: string } | undefined;
      if (!objective) return null;

      const updated = db.prepare(`
        UPDATE company_objectives
        SET ${fields.join(', ')}
        WHERE id = ? AND company_id = ? AND is_active = 1
      `).run(...values, id, companyId);
      return updated.changes === 1 ? objective : null;
    })
  ), 'update RH objective', { retryOnFailure: false });

  if (!outcome.authorized) return deniedResponse();
  if (!outcome.value) {
    return NextResponse.json(
      { error: 'Objetivo nao encontrado ou alterado' },
      { status: 409 },
    );
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'objective_update',
    entityType: 'company_objectives',
    entityId: id,
    entityLabel: outcome.value.title,
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withRole('rh', 'admin')(async (
  _req: NextRequest,
  context,
) => {
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json(
      { error: 'Empresa ou papel de gestao nao encontrado' },
      { status: 400 },
    );
  }

  const id = (await context.params).id;
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, companyId, () => {
      const objective = db.prepare(`
        SELECT id, title
        FROM company_objectives
        WHERE id = ? AND company_id = ? AND is_active = 1
      `).get(id, companyId) as { id: string; title: string } | undefined;
      if (!objective) return null;

      const deleted = db.prepare(`
        UPDATE company_objectives
        SET is_active = 0
        WHERE id = ? AND company_id = ? AND is_active = 1
      `).run(id, companyId);
      return deleted.changes === 1 ? objective : null;
    })
  ), 'delete RH objective', { retryOnFailure: false });

  if (!outcome.authorized) return deniedResponse();
  if (!outcome.value) {
    return NextResponse.json(
      { error: 'Objetivo nao encontrado ou alterado' },
      { status: 409 },
    );
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'objective_delete',
    entityType: 'company_objectives',
    entityId: id,
    entityLabel: outcome.value.title,
  });
  return NextResponse.json({ ok: true });
});
