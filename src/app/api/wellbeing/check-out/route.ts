import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import {
  isWellbeingMood,
  recordWellbeingEvent,
  type WellbeingMood,
} from '@/services/wellbeing.service';

export const POST = withAuth(async (req, { auth }) => {
  await initDb();

  const body = await req.json().catch(() => ({})) as { mood?: unknown };
  if (!isWellbeingMood(body.mood) || body.mood === 'nao_informado') {
    return NextResponse.json(
      { error: 'Selecione como voce encerra o seu dia.' },
      { status: 400 },
    );
  }

  const result = await recordWellbeingEvent({
    userId: auth.userId,
    companyId: auth.companyId,
    eventType: 'check_out',
    mood: body.mood as WellbeingMood,
  });

  if (result.alreadyDone) {
    return NextResponse.json(
      { ...result, error: 'Check-out ja registrado hoje' },
      { status: 429 },
    );
  }

  return NextResponse.json(result);
});
