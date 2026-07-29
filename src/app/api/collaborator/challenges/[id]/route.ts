import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  challengeApiErrorResponse,
  resolveCompanyChallengeActor,
  toPublicCompanyChallengeView,
} from '@/lib/challenges/api';
import { createChallengesRepository } from '@/repositories/challenges.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createCompanyChallengesService } from '@/services/company-challenges.service';

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('progress'),
    progress: z.number().int().min(0).max(100),
  }).strict(),
  z.object({
    action: z.literal('complete'),
  }).strict(),
  z.object({
    action: z.literal('leave'),
  }).strict(),
]);

export const PATCH = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const params = await context.params;
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const challenge = await enqueueCollaboratorSelfWrite(writeQueue, context.auth.userId, (database) => {
      const actor = resolveCompanyChallengeActor(database, context.auth.userId);
      const service = createCompanyChallengesService(
        createChallengesRepository(database),
        createParticipationRepository(database),
      );

      if (parsed.data.action === 'progress') {
        return service.progress({
          actor,
          challengeId: params.id,
          progress: parsed.data.progress,
        });
      }
      if (parsed.data.action === 'complete') {
        return service.complete({
          actor,
          challengeId: params.id,
        });
      }
      return service.leave({
        actor,
        challengeId: params.id,
      });
    });

    return NextResponse.json({ challenge: toPublicCompanyChallengeView(challenge) });
  } catch (error) {
    return challengeApiErrorResponse(error);
  }
});
