import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as collabService from '@/services/collaborator.service';

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const data = collabService.getCollaboratorBadges(auth.userId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
});
