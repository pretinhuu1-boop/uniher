import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { listPersonalObjectiveTemplates } from '@/lib/objectives/catalog';
import {
  objectiveApiErrorResponse,
  resolvePersonalObjectiveActor,
} from '@/lib/objectives/api';
import { createObjectivesRepository } from '@/repositories/objectives.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { createPersonalObjectivesService } from '@/services/personal-objectives.service';

const startSchema = z.object({
  templateKey: z.string().min(1).max(80),
}).strict();

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const db = getReadDb();
    const actor = resolvePersonalObjectiveActor(db, context.auth.userId);
    const objectives = createPersonalObjectivesService(
      createObjectivesRepository(db),
      createParticipationRepository(db),
    ).list(actor);

    return NextResponse.json({
      templates: listPersonalObjectiveTemplates(),
      objectives,
    });
  } catch (error) {
    return objectiveApiErrorResponse(error);
  }
});

export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const body = await req.json().catch(() => null);
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const objective = await enqueueCollaboratorSelfWrite(writeQueue, context.auth.userId, (database) => {
      const actor = resolvePersonalObjectiveActor(database, context.auth.userId);
      return createPersonalObjectivesService(
        createObjectivesRepository(database),
        createParticipationRepository(database),
      ).start({
        actor,
        templateKey: parsed.data.templateKey,
      });
    });

    return NextResponse.json({ objective }, { status: 201 });
  } catch (error) {
    return objectiveApiErrorResponse(error);
  }
});
