import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { claimObjectiveReward } from '@/services/objectives.service';
import { z } from 'zod';

const Schema = z.object({ week_key: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (user) => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { week_key } = Schema.parse(body);

    const result = await claimObjectiveReward(user.id, user.company_id, id, week_key);
    if (!result.ok) {
      return NextResponse.json({ error: 'Recompensa não disponível ou já resgatada' }, { status: 409 });
    }
    return NextResponse.json(result);
  });
}
