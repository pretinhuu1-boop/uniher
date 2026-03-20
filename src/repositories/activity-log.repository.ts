import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface ActivityRow {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  points_earned: number;
  created_at: string;
}

export async function createActivity(data: {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  pointsEarned?: number;
}): Promise<ActivityRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.action,
      data.targetType || null,
      data.targetId || null,
      data.pointsEarned || 0
    );

    return db.prepare('SELECT * FROM activity_log WHERE id = ?').get(id) as ActivityRow;
  });
}

export function getUserActivities(userId: string, limit = 50): ActivityRow[] {
  const db = getReadDb();
  return db.prepare(
    'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit) as ActivityRow[];
}

export function getLatestActivityDate(userId: string): string | null {
  const db = getReadDb();
  const row = db.prepare(
    "SELECT date(created_at) as date FROM activity_log WHERE user_id = ? AND action != 'login' ORDER BY created_at DESC LIMIT 1"
  ).get(userId) as { date: string } | undefined;
  return row?.date || null;
}

export function countDailyActivities(userId: string, date = "date('now')"): number {
  const db = getReadDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM activity_log WHERE user_id = ? AND date(created_at) = date(?)"
  ).get(userId, date) as { count: number };
  return row.count;
}
