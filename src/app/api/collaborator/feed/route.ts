import { NextRequest, NextResponse } from 'next/server';

import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import {
  communityActor,
  communityApiErrorResponse,
  communityQuery,
  requireCollaboratorCapability,
} from '@/lib/community/api';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { createCommunityRepository } from '@/repositories/community.repository';
import { getCommunityFeed } from '@/services/community.service';

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const db = getReadDb();
    const capabilityError = requireCollaboratorCapability(context, db);
    if (capabilityError) return capabilityError;

    const scopes = req.nextUrl.searchParams.getAll('scope');
    if (scopes.some((scope) => scope !== 'company')) {
      return NextResponse.json(
        { error: 'Unsupported community scope', code: 'COMMUNITY_SCOPE_UNSUPPORTED' },
        { status: 422 },
      );
    }

    const repository = createCommunityRepository(db);
    return NextResponse.json(
      getCommunityFeed(communityActor(context), repository, communityQuery(req, ['scope'])),
    );
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});
