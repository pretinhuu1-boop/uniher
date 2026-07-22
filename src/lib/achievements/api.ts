import { NextResponse } from 'next/server';
import type Database from 'better-sqlite3';
import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import type { ParticipationActor } from '@/services/participation.service';

export class AchievementApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AchievementApiError';
  }
}

export function resolvePrivateAchievementActor(
  database: Database.Database,
  userId: string,
): ParticipationActor {
  if (!hasCollaboratorSelfCapability(userId, database)) {
    throw new AchievementApiError('Permissao insuficiente', 403);
  }

  const user = database.prepare(`
    SELECT company_id
    FROM users
    WHERE id = ?
      AND deleted_at IS NULL
  `).get(userId) as { company_id: string | null } | undefined;

  if (!user?.company_id) {
    throw new AchievementApiError('Usuario sem empresa ativa', 403);
  }

  return {
    userId,
    companyId: user.company_id,
  };
}

export function achievementApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AchievementApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.message.includes('not approved')) {
    return NextResponse.json({ error: 'Conquista indisponivel' }, { status: 422 });
  }
  throw error;
}
