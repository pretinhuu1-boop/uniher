/**
 * POST /api/collaborator/semaforo/recalculate — força recalculo do semáforo
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { recalculateSemaforo } from '@/services/semaforo-calculator.service';
import { initDb } from '@/lib/db/init';

export const POST = withAuth(async (_req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;

  await recalculateSemaforo(userId);

  return NextResponse.json({ success: true, message: 'Semáforo recalculado' });
});
