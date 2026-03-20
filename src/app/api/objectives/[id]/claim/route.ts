import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { claimObjectiveReward } from '@/services/objectives.service';
import { getReadDb } from '@/lib/db';
import { z } from 'zod';

const Schema = z.object({ week_key: z.string().optional() });

export const POST = withAuth(async (req: NextRequest, context) => {
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(context.auth.userId) as { company_id: string } | undefined;
  if (!user?.company_id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = (await context.params).id;
  const body = await req.json().catch(() => ({}));
  const { week_key } = Schema.parse(body);

  const result = await claimObjectiveReward(context.auth.userId, user.company_id, id, week_key);
  if (!result.ok) {
    return NextResponse.json({ error: 'Recompensa não disponível ou já resgatada' }, { status: 409 });
  }
  return NextResponse.json(result);
});
