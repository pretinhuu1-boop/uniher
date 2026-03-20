import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { objectiveRepo } from '@/repositories/objective.repository';
import { createObjective } from '@/services/objectives.service';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(['weekly', 'goal', 'campaign']),
  target_type: z.enum(['points', 'missions', 'level', 'streak', 'challenges', 'campaign_join', 'campaign_complete']),
  target_value: z.number().int().min(1).max(100000),
  campaign_id: z.string().uuid().optional(),
  reward_type: z.enum(['points', 'badge', 'custom']),
  reward_points: z.number().int().min(0).max(10000).optional(),
  reward_badge_id: z.string().uuid().optional(),
  reward_custom: z.string().max(300).optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional(),
});

export async function GET(req: NextRequest) {
  return withRole(req, ['rh', 'lideranca', 'admin'], async (user) => {
    const objectives = objectiveRepo.getByCompany(user.company_id);
    return NextResponse.json({ objectives });
  });
}

export async function POST(req: NextRequest) {
  return withRole(req, ['rh', 'admin'], async (user) => {
    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
    }

    const d = parsed.data;
    if (d.reward_type === 'points' && !d.reward_points) {
      return NextResponse.json({ error: 'reward_points obrigatório para tipo points' }, { status: 422 });
    }
    if (d.reward_type === 'custom' && !d.reward_custom) {
      return NextResponse.json({ error: 'reward_custom obrigatório para tipo custom' }, { status: 422 });
    }
    if (d.type === 'campaign' && !d.campaign_id) {
      return NextResponse.json({ error: 'campaign_id obrigatório para tipo campaign' }, { status: 422 });
    }

    const obj = await createObjective({ ...d, company_id: user.company_id, created_by: user.id });
    await logAudit(user.id, user.company_id, 'objective_create', 'company_objectives', obj.id);
    return NextResponse.json({ objective: obj }, { status: 201 });
  });
}
