import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { completeMission } from '@/services/daily-missions.service';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

const ReadContentPayload = z.object({
  note: z.string().trim().min(20).max(500),
});

export const POST = withAuth(async (req, context) => {
  const payload = ReadContentPayload.safeParse(await req.json().catch(() => ({})));
  if (!payload.success) {
    return NextResponse.json({ error: 'Descreva brevemente o conteúdo lido.' }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await completeMission(context.auth.userId, id, payload.data);
  if (!result.success) {
    return NextResponse.json({ error: 'Progresso indisponível para esta missão.' }, { status: 410 });
  }

  return NextResponse.json({
    success: true,
    progressRecorded: true,
    gamification: LEGACY_GAMIFICATION_STATE,
  });
});
