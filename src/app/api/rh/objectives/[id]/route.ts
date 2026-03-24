import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { objectiveRepo } from '@/repositories/objective.repository';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const UpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(500).optional(),
  target_value: z.number().int().min(1).max(100000).optional(),
  reward_type: z.enum(['points', 'badge', 'custom']).optional(),
  reward_points: z.number().int().min(0).max(10000).optional(),
  reward_badge_id: z.string().uuid().optional(),
  reward_custom: z.string().max(300).optional(),
  starts_at: z.string().datetime({ offset: true }).nullable().optional(),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  is_active: z.literal(0).optional(),
});

export const PATCH = withRole('rh', 'admin')(async (req: NextRequest, context) => {
  const db = getReadDb();
  const u = db.prepare('SELECT company_id FROM users WHERE id = ?').get(context.auth.userId) as { company_id: string } | undefined;
  if (!u?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const id = (await context.params).id;
  const obj = objectiveRepo.getById(id);
  if (!obj || obj.company_id !== u.company_id) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 });

  const updateData = {
    ...parsed.data,
    starts_at: parsed.data.starts_at === null ? undefined : parsed.data.starts_at,
    ends_at: parsed.data.ends_at === null ? undefined : parsed.data.ends_at,
  };
  getWriteQueue().enqueue(() => objectiveRepo.update(id, updateData));
  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'objective_update',
    entityType: 'company_objectives',
    entityId: id,
    entityLabel: obj.title,
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withRole('rh', 'admin')(async (_req: NextRequest, context) => {
  const db = getReadDb();
  const u = db.prepare('SELECT company_id FROM users WHERE id = ?').get(context.auth.userId) as { company_id: string } | undefined;
  if (!u?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const id = (await context.params).id;
  const obj = objectiveRepo.getById(id);
  if (!obj || obj.company_id !== u.company_id) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  getWriteQueue().enqueue(() => objectiveRepo.delete(id));
  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'objective_delete',
    entityType: 'company_objectives',
    entityId: id,
    entityLabel: obj.title,
  });
  return NextResponse.json({ ok: true });
});
