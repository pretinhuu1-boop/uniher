import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { completeMission } from '@/services/daily-missions.service';
import { checkAndUnlockBadges } from '@/services/gamification.service';

const MissionPayloadSchema = z.object({
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional(),
  glasses: z.number().int().min(0).max(20).optional(),
  minutes: z.number().int().min(0).max(480).optional(),
  hours: z.number().min(0).max(24).optional(),
  note: z.string().max(500).optional(),
  challengeId: z.string().max(100).optional(),
}).optional();

export const POST = withAuth(async (req, context) => {
  try {
    const userId = context.auth.userId;
    const { id: missionId } = await context.params;
    const rawBody = await req.json().catch(() => undefined);

    const parseResult = MissionPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = parseResult.data ?? {};

    const result = await completeMission(userId, missionId, payload);
    if (!result.success) {
      return NextResponse.json({ error: 'Missão não encontrada ou já completada' }, { status: 400 });
    }

    const badgesUnlocked = await checkAndUnlockBadges(userId);
    return NextResponse.json({ ...result, badgesUnlocked });
  } catch (error) {
    console.error('[MissionComplete] Error:', error);
    return NextResponse.json({ error: 'Erro ao completar missão' }, { status: 500 });
  }
});
