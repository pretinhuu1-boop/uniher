import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

const inflightReadUpdates = new Map<string, Promise<void>>();

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export function getUserNotifications(userId: string, limit = 20): NotificationRow[] {
  const db = getReadDb();
  return db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit) as NotificationRow[];
}

export function countUnread(userId: string): number {
  const db = getReadDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0'
  ).get(userId) as { count: number };
  return row.count;
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await setReadStatus(notificationId, userId, true);
}

export async function setReadStatus(notificationId: string, userId: string, read: boolean): Promise<void> {
  const inflightKey = `${userId}:${notificationId}:${read ? 1 : 0}`;
  const existing = inflightReadUpdates.get(inflightKey);
  if (existing) {
    await existing;
    return;
  }

  const writeQueue = getWriteQueue();
  const task = writeQueue.enqueue((db) => {
    const current = db.prepare(
      'SELECT read FROM notifications WHERE id = ? AND user_id = ?'
    ).get(notificationId, userId) as { read: number } | undefined;

    if (!current || current.read === (read ? 1 : 0)) {
      return;
    }

    db.prepare('UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?').run(read ? 1 : 0, notificationId, userId);
  });

  inflightReadUpdates.set(inflightKey, task);

  try {
    await task;
  } finally {
    inflightReadUpdates.delete(inflightKey);
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  });
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
}): Promise<NotificationRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.userId, data.type, data.title, data.message);
    return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as NotificationRow;
  });
}
