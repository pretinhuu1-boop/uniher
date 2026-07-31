import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as activityRepo from '@/repositories/activity-log.repository';

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

// Activities are server-authored. Clients may only read their own history.
export const POST = withAuth(async () => NextResponse.json(
  { error: 'Registro direto de atividades nao permitido' },
  { status: 405, headers: { Allow: 'GET' } },
));
