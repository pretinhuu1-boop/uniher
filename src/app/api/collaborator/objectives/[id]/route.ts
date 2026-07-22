import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  objectiveApiErrorResponse,
  resolvePersonalObjectiveActor,
} from '@/lib/objectives/api';
import { createObjectivesRepository } from '@/repositories/objectives.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createPersonalObjectivesService } from '@/services/personal-objectives.service';

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('progress'),
    progress: z.number().int().min(0).max(100),
  }).strict(),
  z.object({
    action: z.literal('complete'),
  }).strict(),
  z.object({
    action: z.literal('archive'),
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
    const objective = await enqueueCollaboratorSelfWrite(writeQueue, context.auth.userId, (database) => {
      const actor = resolvePersonalObjectiveActor(database, context.auth.userId);
      const service = createPersonalObjectivesService(
        createObjectivesRepository(database),
        createParticipationRepository(database),
      );

      if (parsed.data.action === 'progress') {
        return service.progress({
          actor,
          objectiveId: params.id,
          progress: parsed.data.progress,
        });
      }
      if (parsed.data.action === 'complete') {
        return service.complete({
          actor,
          objectiveId: params.id,
        });
      }
      return service.archive({
        actor,
        objectiveId: params.id,
      });
    });

    return NextResponse.json({ objective });
  } catch (error) {
    return objectiveApiErrorResponse(error);
  }
});
