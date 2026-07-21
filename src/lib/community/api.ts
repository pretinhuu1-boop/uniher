import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { CollaboratorSelfWriteError, hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import type { AuthContext } from '@/lib/auth/middleware';
import { AppError, handleApiError } from '@/lib/errors';
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
  const query: Record<string, string> = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    if (omittedKeys.has(key)) continue;
    if (Object.hasOwn(query, key)) {
      throw new AppError('Invalid community query', 422, 'COMMUNITY_QUERY_INVALID');
    }
    query[key] = value;
  }
  return query;
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
  return handleApiError(error);
}
