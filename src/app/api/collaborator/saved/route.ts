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
import { getSavedCommunityPosts } from '@/services/community.service';

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  await initDb();
  const db = getReadDb();
  const capabilityError = requireCollaboratorCapability(context, db);
  if (capabilityError) return capabilityError;

  try {
    const repository = createCommunityRepository(db);
    return NextResponse.json(
      getSavedCommunityPosts(communityActor(context), repository, communityQuery(req)),
    );
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});
