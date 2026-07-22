import { NextRequest, NextResponse } from 'next/server';

import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import {
  communityActor,
  communityApiErrorResponse,
  communityQuery,
  runCollaboratorCommunityRead,
} from '@/lib/community/api';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { createCommunityRepository } from '@/repositories/community.repository';
import { getCommunitySupporters } from '@/services/community.service';

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const db = getReadDb();
    const { id } = await context.params;

    const query = communityQuery(req);
    const response = runCollaboratorCommunityRead(context, db, () =>
      getCommunitySupporters(communityActor(context), createCommunityRepository(db), id, query),
    );
    return NextResponse.json(response);
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});
