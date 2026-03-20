import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { objectiveRepo } from '@/repositories/objective.repository';
import { writeQueue } from '@/lib/db/write-queue';
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withRole(req, ['rh', 'admin'], async (user) => {
    const { id } = await params;
    const obj = objectiveRepo.getById(id);
    if (!obj || obj.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 });

    await writeQueue.enqueue(async () => objectiveRepo.update(id, parsed.data));
    await logAudit(user.id, user.company_id, 'objective_update', 'company_objectives', id);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withRole(req, ['rh', 'admin'], async (user) => {
    const { id } = await params;
    const obj = objectiveRepo.getById(id);
    if (!obj || obj.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    await writeQueue.enqueue(async () => objectiveRepo.delete(id));
    await logAudit(user.id, user.company_id, 'objective_delete', 'company_objectives', id);
    return NextResponse.json({ ok: true });
  });
}
