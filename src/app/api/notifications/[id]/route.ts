import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';

// PATCH /api/notifications/[id] — toggle read
export const PATCH = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const { id } = await context.params;
  await initDb();

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!notif) return;
    const newRead = notif.read ? 0 : 1;
    db.prepare(`UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?`).run(newRead, id, userId);
  });

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
