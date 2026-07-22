import { NextResponse } from 'next/server';
import type Database from 'better-sqlite3';
import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import type { ParticipationActor } from '@/services/participation.service';

export class ChallengeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ChallengeApiError';
  }
}

export function resolveCompanyChallengeActor(
  database: Database.Database,
  userId: string,
): ParticipationActor {
  if (!hasCollaboratorSelfCapability(userId, database)) {
    throw new ChallengeApiError('Permissao insuficiente', 403);
  }

  const user = database.prepare(`
    SELECT company_id
    FROM users
    WHERE id = ?
      AND deleted_at IS NULL
  `).get(userId) as { company_id: string | null } | undefined;

  if (!user?.company_id) {
    throw new ChallengeApiError('Usuario sem empresa ativa', 403);
  }

  return {
    userId,
    companyId: user.company_id,
  };
}

export function challengeApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ChallengeApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error) {
    if (error.message === 'Challenge not found') {
      return NextResponse.json({ error: 'Desafio nao encontrado' }, { status: 404 });
    }
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Voce ja participa deste desafio' }, { status: 409 });
    }
    if (error.message.includes('not approved')) {
      return NextResponse.json({ error: 'Desafio indisponivel' }, { status: 422 });
    }
    if (error.message.includes('not joined')) {
      return NextResponse.json({ error: 'Desafio nao esta em andamento' }, { status: 409 });
    }
    if (error.message.includes('monotonic')) {
      return NextResponse.json({ error: 'O progresso nao pode retroceder' }, { status: 409 });
    }
  }
  throw error;
}
