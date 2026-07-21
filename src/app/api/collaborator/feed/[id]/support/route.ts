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
import {
  addCommunityPostSupport,
  removeCommunityPostSupport,
} from '@/services/community.service';

type SupportAction = typeof addCommunityPostSupport;

async function mutateSupport(req: NextRequest, context: AuthContext, action: SupportAction) {
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

export const POST = withAuth((req, context) => mutateSupport(req, context, addCommunityPostSupport));
export const DELETE = withAuth((req, context) => mutateSupport(req, context, removeCommunityPostSupport));
