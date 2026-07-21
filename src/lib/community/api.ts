import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { CollaboratorSelfWriteError, hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import type { AuthContext } from '@/lib/auth/middleware';
import type Database from 'better-sqlite3';
import { CommunityServiceError, type CommunityActor } from '@/services/community.service';

export function communityActor(context: AuthContext): CommunityActor {
  return { userId: context.auth.userId, companyId: context.auth.companyId };
}

export function requireCollaboratorCapability(
  context: AuthContext,
  database: Database.Database,
): NextResponse | null {
  if (hasCollaboratorSelfCapability(context.auth.userId, database)) return null;
  return NextResponse.json(
    { error: 'Permissao insuficiente', code: 'COLLABORATOR_CAPABILITY_REQUIRED' },
    { status: 403 },
  );
}

export function communityQuery(req: NextRequest, omitted: readonly string[] = []): Record<string, string> {
  const omittedKeys = new Set(omitted);
  return Object.fromEntries(
    Array.from(req.nextUrl.searchParams.entries()).filter(([key]) => !omittedKeys.has(key)),
  );
}

export function communityApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof CommunityServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  if (error instanceof CollaboratorSelfWriteError) {
    return NextResponse.json(
      { error: error.message, code: 'COLLABORATOR_CAPABILITY_REQUIRED' },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Invalid community query', code: 'COMMUNITY_QUERY_INVALID' },
      { status: 422 },
    );
  }
  if (error instanceof Error && error.message === 'Invalid community cursor') {
    return NextResponse.json(
      { error: 'Invalid community cursor', code: 'COMMUNITY_CURSOR_INVALID' },
      { status: 422 },
    );
  }
  throw error;
}
