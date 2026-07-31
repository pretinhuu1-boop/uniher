import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(['weekly', 'goal', 'campaign']),
  target_type: z.enum([
    'points',
    'missions',
    'level',
    'streak',
    'challenges',
    'campaign_join',
    'campaign_complete',
  ]),
  target_value: z.number().int().min(1).max(100000),
  campaign_id: z.string().min(1).max(100).optional(),
  reward_type: z.enum(['points', 'badge', 'custom']),
  reward_points: z.number().int().min(0).max(10000).optional(),
  reward_badge_id: z.string().min(1).max(100).optional(),
  reward_custom: z.string().max(300).optional(),
  starts_at: z.string().datetime({ offset: true }).optional(),
  ends_at: z.string().datetime({ offset: true }).optional(),
});

export const GET = withRole('rh', 'lideranca', 'admin')(async (
  _req,
  context,
) => {
  const companyId = context.auth.companyId;
  if (!companyId) return NextResponse.json({ objectives: [] });

  const db = getReadDb();
  const objectives = db.prepare(`
    SELECT o.*, c.name as campaign_name, b.name as reward_badge_name
    FROM company_objectives o
    LEFT JOIN campaigns c
      ON c.id = o.campaign_id
     AND c.company_id = o.company_id
    LEFT JOIN badges b ON b.id = o.reward_badge_id
    WHERE o.company_id = ? AND o.is_active = 1
    ORDER BY o.created_at DESC
  `).all(companyId);
  return NextResponse.json({ objectives });
});

export const POST = withRole('rh', 'admin')(async (
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

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;
  if (data.reward_type === 'points' && !data.reward_points) {
    return NextResponse.json(
      { error: 'reward_points obrigatorio para tipo points' },
      { status: 422 },
    );
  }
  if (data.reward_type === 'custom' && !data.reward_custom) {
    return NextResponse.json(
      { error: 'reward_custom obrigatorio para tipo custom' },
      { status: 422 },
    );
  }
  if (data.type === 'campaign' && !data.campaign_id) {
    return NextResponse.json(
      { error: 'campaign_id obrigatorio para tipo campaign' },
      { status: 422 },
    );
  }

  const id = nanoid();
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, companyId, () => {
      if (data.campaign_id) {
        const campaign = db.prepare(`
          SELECT id
          FROM campaigns
          WHERE id = ? AND company_id = ?
        `).get(data.campaign_id, companyId);
        if (!campaign) return { status: 'invalid_campaign' as const };
      }

      db.prepare(`
        INSERT INTO company_objectives (
          id, company_id, title, description, type, target_type, target_value,
          campaign_id, reward_type, reward_points, reward_badge_id,
          reward_custom, starts_at, ends_at, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        companyId,
        data.title,
        data.description ?? null,
        data.type,
        data.target_type,
        data.target_value,
        data.campaign_id ?? null,
        data.reward_type,
        data.reward_points ?? 0,
        data.reward_badge_id ?? null,
        data.reward_custom ?? null,
        data.starts_at ?? null,
        data.ends_at ?? null,
        context.auth.userId,
      );
      const objective = db.prepare(`
        SELECT *
        FROM company_objectives
        WHERE id = ? AND company_id = ?
      `).get(id, companyId);
      return { status: 'created' as const, objective };
    })
  ), 'create RH objective', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json(
      { error: 'Autorizacao do RH expirou' },
      { status: 409 },
    );
  }
  if (outcome.value.status === 'invalid_campaign') {
    return NextResponse.json(
      { error: 'Campanha nao pertence a empresa' },
      { status: 409 },
    );
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'objective_create',
    entityType: 'company_objectives',
    entityId: id,
    entityLabel: data.title,
  });
  return NextResponse.json(
    { objective: outcome.value.objective },
    { status: 201 },
  );
});
