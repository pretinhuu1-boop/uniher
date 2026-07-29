import { NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import {
  CollaboratorSelfWriteError,
  enqueueCollaboratorSelfWrite,
  hasCollaboratorSelfCapability,
} from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { SEMAFORO_PRIVATE_HEADERS } from '@/lib/semaforo/containment';
import {
  createPersonalSemaforoEntry,
  deletePersonalSemaforoData,
  readPersonalSemaforoState,
  semaforoSelfReportSchema,
} from '@/lib/semaforo/self-report';

function forbidden() {
  return NextResponse.json(
    { error: 'Permissão insuficiente' },
    { status: 403, headers: SEMAFORO_PRIVATE_HEADERS },
  );
}

export const GET = withAuth(async (_req, context: AuthContext) => {
  await initDb();
  const db = getReadDb();
  if (!hasCollaboratorSelfCapability(context.auth.userId, db)) return forbidden();

  return NextResponse.json(
    readPersonalSemaforoState(db, context.auth.userId),
    { headers: SEMAFORO_PRIVATE_HEADERS },
  );
});

export const POST = withAuth(async (req, context: AuthContext) => {
  await initDb();
  const body = await req.json().catch(() => null);
  const parsed = semaforoSelfReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.issues },
      { status: 400, headers: SEMAFORO_PRIVATE_HEADERS },
    );
  }

  try {
    const state = await enqueueCollaboratorSelfWrite(
      getWriteQueue(),
      context.auth.userId,
      (db) => createPersonalSemaforoEntry(db, context.auth.userId, parsed.data),
    );

    return NextResponse.json(state, { status: 201, headers: SEMAFORO_PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof CollaboratorSelfWriteError) return forbidden();
    throw error;
  }
});

export const DELETE = withAuth(async (_req, context: AuthContext) => {
  await initDb();

  try {
    const result = await enqueueCollaboratorSelfWrite(
      getWriteQueue(),
      context.auth.userId,
      (db) => deletePersonalSemaforoData(db, context.auth.userId),
    );

    return NextResponse.json(result, { headers: SEMAFORO_PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof CollaboratorSelfWriteError) return forbidden();
    throw error;
  }
});
