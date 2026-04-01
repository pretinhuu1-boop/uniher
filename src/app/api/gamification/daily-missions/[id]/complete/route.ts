import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { completeMission } from '@/services/daily-missions.service';
import { checkAndUnlockBadges } from '@/services/gamification.service';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

const MissionPayloadSchema = z.object({
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional(),
  glasses: z.number().int().min(0).max(20).optional(),
  minutes: z.number().int().min(0).max(480).optional(),
  hours: z.number().min(0).max(24).optional(),
  note: z.string().max(500).optional(),
  challengeId: z.string().max(100).optional(),
  badgeId: z.string().max(100).optional(),
  confirmed: z.boolean().optional(),
}).optional();

export const POST = withAuth(async (req, context) => {
  try {
    await initDb();
    const userId = context.auth.userId;
    const { id: missionId } = await context.params;
    const rawBody = await req.json().catch(() => undefined);

    const parseResult = MissionPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Payload invalido', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const payload = parseResult.data ?? {};
    const db = getReadDb();
    const today = new Date().toISOString().split('T')[0];

    const mission = db.prepare(
      `SELECT id, action, day, completed FROM daily_missions WHERE id = ? AND user_id = ?`
    ).get(missionId, userId) as { id: string; action: string; day: string; completed: number } | undefined;

    if (!mission || mission.day !== today || mission.completed === 1) {
      return NextResponse.json({ error: 'Missao nao encontrada ou ja completada' }, { status: 400 });
    }

    if (mission.action === 'check_in') {
      const user = db.prepare(`SELECT last_active FROM users WHERE id = ?`).get(userId) as { last_active?: string } | undefined;
      const didCheckinToday = !!(user?.last_active && user.last_active.substring(0, 10) === today);
      if (!didCheckinToday) {
        return NextResponse.json({ error: 'Faca seu check-in diario antes de concluir esta missao.' }, { status: 400 });
      }
      if (!payload.mood) {
        return NextResponse.json({ error: 'Informe como voce esta se sentindo para concluir o check-in.' }, { status: 400 });
      }
    }

    if (mission.action === 'drink_water') {
      if (!payload.glasses || payload.glasses < 4) {
        return NextResponse.json({ error: 'Para concluir, registre no minimo 4 copos de agua.' }, { status: 400 });
      }
    }

    if (mission.action === 'complete_challenge') {
      if (!payload.challengeId) {
        return NextResponse.json({ error: 'Selecione um desafio ativo para concluir esta missao.' }, { status: 400 });
      }
      const challenge = db.prepare(
        `SELECT status FROM user_challenges WHERE user_id = ? AND challenge_id = ?`
      ).get(userId, payload.challengeId) as { status: string } | undefined;
      if (!challenge || challenge.status !== 'active') {
        return NextResponse.json({ error: 'Desafio invalido ou nao esta ativo.' }, { status: 400 });
      }
    }

    if (mission.action === 'read_content') {
      const noteSize = payload.note?.trim().length ?? 0;
      if (noteSize < 20) {
        return NextResponse.json({ error: 'Descreva brevemente o que voce leu (minimo 20 caracteres).' }, { status: 400 });
      }
    }

    if (mission.action === 'update_semaforo') {
      if (!payload.confirmed) {
        return NextResponse.json({ error: 'Confirme que voce atualizou o Semaforo de Saude para concluir.' }, { status: 400 });
      }
      const updatedToday = db.prepare(
        `SELECT COUNT(*) as c FROM health_scores WHERE user_id = ? AND DATE(recorded_at) = ?`
      ).get(userId, today) as { c: number };
      if (!updatedToday.c) {
        return NextResponse.json({ error: 'Atualize o Semaforo hoje antes de concluir esta missao.' }, { status: 400 });
      }
    }

    if (mission.action === 'share_badge') {
      if (!payload.badgeId) {
        return NextResponse.json({ error: 'Selecione uma conquista para compartilhar.' }, { status: 400 });
      }
      const hasBadge = db.prepare(
        `SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ? LIMIT 1`
      ).get(userId, payload.badgeId);
      if (!hasBadge) {
        return NextResponse.json({ error: 'Badge invalido para sua conta.' }, { status: 400 });
      }
    }

    const result = await completeMission(userId, missionId, payload);
    if (!result.success) {
      return NextResponse.json({ error: 'Missao nao encontrada ou ja completada' }, { status: 400 });
    }

    const badgesUnlocked = await checkAndUnlockBadges(userId);
    return NextResponse.json({ ...result, badgesUnlocked });
  } catch (error) {
    console.error('[MissionComplete] Error:', error);
    return NextResponse.json({ error: 'Erro ao completar missao' }, { status: 500 });
  }
});
