import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as activityRepo from '@/repositories/activity-log.repository';
import * as activityService from '@/services/activity.service';

// GET /api/collaborator/activities - listar histórico
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const data = activityRepo.getUserActivities(auth.userId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/collaborator/activities - registrar ação genérica (ex: leu conteúdo, check-in)
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const { action, targetType, targetId, points } = await req.json();

    if (!action) {
      return NextResponse.json({ error: 'action é obrigatório' }, { status: 400 });
    }

    const result = await activityService.recordActivity(auth.userId, {
      action,
      targetType,
      targetId,
      points: points || 0
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
});
