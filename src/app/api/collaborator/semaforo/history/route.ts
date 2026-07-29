import { NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { SEMAFORO_PRIVATE_HEADERS } from '@/lib/semaforo/containment';
import { listPersonalSemaforoHistory } from '@/lib/semaforo/self-report';

export const GET = withAuth(async (req, context: AuthContext) => {
  await initDb();
  const db = getReadDb();
  if (!hasCollaboratorSelfCapability(context.auth.userId, db)) {
    return NextResponse.json(
      { error: 'Permissão insuficiente' },
      { status: 403, headers: SEMAFORO_PRIVATE_HEADERS },
    );
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 12);

  return NextResponse.json(
    listPersonalSemaforoHistory(db, context.auth.userId, Number.isFinite(limit) ? limit : 12),
    { headers: SEMAFORO_PRIVATE_HEADERS },
  );
});
