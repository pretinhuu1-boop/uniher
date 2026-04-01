import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as collabService from '@/services/collaborator.service';
import * as notifRepo from '@/repositories/notification.repository';

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const data = collabService.getCollaboratorNotifications(auth.userId);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

// PATCH /api/notifications - marcar todas como lidas
export const PATCH = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    await notifRepo.markAllAsRead(auth.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
