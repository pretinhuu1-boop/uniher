import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as notifRepo from '@/repositories/notification.repository';

export const PATCH = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const { notificationId, all } = await req.json();

    if (all) {
      await notifRepo.markAllAsRead(auth.userId);
    } else if (notificationId) {
      await notifRepo.markAsRead(notificationId, auth.userId);
    } else {
      return NextResponse.json({ error: 'notificationId ou all é obrigatório' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
