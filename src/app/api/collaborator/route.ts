import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as collabService from '@/services/collaborator.service';

// GET /api/collaborator - dados da home da colaboradora
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const data = collabService.getCollaboratorHome(auth.userId, auth.companyId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
});
