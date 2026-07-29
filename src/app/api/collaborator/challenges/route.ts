import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  challengeApiErrorResponse,
  resolveCompanyChallengeActor,
  toPublicCompanyChallengeView,
} from '@/lib/challenges/api';
import { createChallengesRepository } from '@/repositories/challenges.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createCompanyChallengesService } from '@/services/company-challenges.service';

const joinSchema = z.object({
  catalogKey: z.string().min(1).max(80),
}).strict();

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const db = getReadDb();
    const actor = resolveCompanyChallengeActor(db, context.auth.userId);
    const payload = createCompanyChallengesService(
      createChallengesRepository(db),
      createParticipationRepository(db),
    ).list(actor);

    return NextResponse.json({
      catalog: payload.catalog,
      challenges: payload.challenges.map(toPublicCompanyChallengeView),
    });
  } catch (error) {
    return challengeApiErrorResponse(error);
  }
});

export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const body = await req.json().catch(() => null);
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const challenge = await enqueueCollaboratorSelfWrite(writeQueue, context.auth.userId, (database) => {
      const actor = resolveCompanyChallengeActor(database, context.auth.userId);
      return createCompanyChallengesService(
        createChallengesRepository(database),
        createParticipationRepository(database),
      ).join({
        actor,
        catalogKey: parsed.data.catalogKey,
      });
    });

    return NextResponse.json({ challenge: toPublicCompanyChallengeView(challenge) }, { status: 201 });
  } catch (error) {
    return challengeApiErrorResponse(error);
  }
});
