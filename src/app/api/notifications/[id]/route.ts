import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import * as notifRepo from '@/repositories/notification.repository';

// PATCH /api/notifications/[id] - define read state explicitly
export const PATCH = withAuth(async (req, context) => {
  const userId = context.auth.userId;
  const { id } = await context.params;
  await initDb();

  const body = await req.json().catch(() => ({}));
  const desiredRead = typeof body?.read === 'boolean' ? body.read : true;
  await notifRepo.setReadStatus(id, userId, desiredRead);

  return NextResponse.json({ success: true });
});

// DELETE /api/notifications/[id]
export const DELETE = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const { id } = await context.params;
  await initDb();

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId);
  });

  return NextResponse.json({ success: true });
});
