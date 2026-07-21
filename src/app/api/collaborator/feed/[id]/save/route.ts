import { NextRequest, NextResponse } from 'next/server';

import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import {
  communityActor,
  communityApiErrorResponse,
  requireCollaboratorCapability,
} from '@/lib/community/api';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import { createCommunityRepository } from '@/repositories/community.repository';
import { saveCommunityPost, unsaveCommunityPost } from '@/services/community.service';

type SaveAction = typeof saveCommunityPost;

async function mutateSave(req: NextRequest, context: AuthContext, action: SaveAction) {
  await initDb();
  const capabilityError = requireCollaboratorCapability(context, getReadDb());
  if (capabilityError) return capabilityError;
  await checkWriteRateLimit(req);
  const { id } = await context.params;

  try {
    const state = await enqueueCollaboratorSelfWrite(
      getWriteQueue(),
      context.auth.userId,
      (writeDb) => action(communityActor(context), createCommunityRepository(writeDb), id),
    );
    return NextResponse.json(state);
  } catch (error) {
    return communityApiErrorResponse(error);
  }
}

export const POST = withAuth((req, context) => mutateSave(req, context, saveCommunityPost));
export const DELETE = withAuth((req, context) => mutateSave(req, context, unsaveCommunityPost));
