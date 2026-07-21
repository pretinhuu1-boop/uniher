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
import { getCommunitySupporters } from '@/services/community.service';

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const db = getReadDb();
    const capabilityError = requireCollaboratorCapability(context, db);
    if (capabilityError) return capabilityError;
    const { id } = await context.params;

    const repository = createCommunityRepository(db);
    return NextResponse.json(
      getCommunitySupporters(communityActor(context), repository, id, communityQuery(req)),
    );
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});
