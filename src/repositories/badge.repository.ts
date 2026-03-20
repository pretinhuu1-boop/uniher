import { getReadDb, getWriteQueue } from '@/lib/db';

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: string;
  created_at: string;
}

export interface UserBadge extends BadgeRow {
  unlocked_at: string | null;
  unlocked: boolean;
}

export function getAllBadges(): BadgeRow[] {
  const db = getReadDb();
  return db.prepare('SELECT * FROM badges ORDER BY points ASC').all() as BadgeRow[];
}

export function getUserBadges(userId: string): UserBadge[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT
      b.*,
      ub.unlocked_at,
      CASE WHEN ub.user_id IS NOT NULL THEN 1 ELSE 0 END as unlocked
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ?
    ORDER BY b.points ASC
  `).all(userId) as UserBadge[];
}

export function getUnlockedBadgeIds(userId: string): string[] {
  const db = getReadDb();
  const rows = db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId) as { badge_id: string }[];
  return rows.map(r => r.badge_id);
}

export function countUserBadges(userId: string): number {
  const db = getReadDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?').get(userId) as { count: number };
  return row.count;
}

export async function unlockBadge(userId: string, badgeId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    // INSERT OR IGNORE para nao duplicar
    db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
  });
}

export function countBadgesByDepartment(departmentId: string): number {
  const db = getReadDb();
  const row = db.prepare(`
    SELECT COUNT(ub.badge_id) as count
    FROM user_badges ub
    JOIN users u ON u.id = ub.user_id
    WHERE u.department_id = ?
  `).get(departmentId) as { count: number };
  return row.count;
}
