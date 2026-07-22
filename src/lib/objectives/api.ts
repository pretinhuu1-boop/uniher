import { NextResponse } from 'next/server';
import type Database from 'better-sqlite3';
import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import type { ParticipationActor } from '@/services/participation.service';

export class ObjectiveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ObjectiveApiError';
  }
}

export function resolvePersonalObjectiveActor(
  database: Database.Database,
  userId: string,
): ParticipationActor {
  if (!hasCollaboratorSelfCapability(userId, database)) {
    throw new ObjectiveApiError('Permissao insuficiente', 403);
  }

  const user = database.prepare(`
    SELECT company_id
    FROM users
    WHERE id = ?
      AND deleted_at IS NULL
  `).get(userId) as { company_id: string | null } | undefined;

  if (!user?.company_id) {
    throw new ObjectiveApiError('Usuario sem empresa ativa', 403);
  }

  return {
    userId,
    companyId: user.company_id,
  };
}

export function objectiveApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ObjectiveApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    if (error.message === 'Objective not found') {
      return NextResponse.json({ error: 'Objetivo nao encontrado' }, { status: 404 });
    }
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Voce ja possui este objetivo em andamento' }, { status: 409 });
    }
    if (error.message.includes('not approved')) {
      return NextResponse.json({ error: 'Objetivo indisponivel' }, { status: 422 });
    }
    if (error.message.includes('not active')) {
      return NextResponse.json({ error: 'Objetivo nao esta em andamento' }, { status: 409 });
    }
  }
  throw error;
}
