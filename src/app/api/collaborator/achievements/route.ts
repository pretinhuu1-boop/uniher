import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { enqueueCollaboratorSelfWrite } from '@/lib/auth/collaborator-self';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  achievementApiErrorResponse,
  resolvePrivateAchievementActor,
} from '@/lib/achievements/api';
import { createAchievementsRepository } from '@/repositories/achievements.repository';
import { createPrivateAchievementsService } from '@/services/private-achievements.service';

export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    await initDb();
    const writeQueue = getWriteQueue();
    const achievements = await enqueueCollaboratorSelfWrite(writeQueue, context.auth.userId, (database) => {
      const actor = resolvePrivateAchievementActor(database, context.auth.userId);
      return createPrivateAchievementsService(
        createAchievementsRepository(database),
      ).sync(actor);
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    return achievementApiErrorResponse(error);
  }
});
