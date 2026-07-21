import { getWriteQueue } from '@/lib/db';

export async function dailyCheckIn(userId: string): Promise<{
  newStreak: number;
  alreadyDone: boolean;
}> {
  return getWriteQueue().enqueue((db) => {
    const user = db.prepare('SELECT streak, last_active FROM users WHERE id = ?').get(userId) as {
      streak: number;
      last_active: string | null;
    } | undefined;
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const lastActive = user.last_active?.slice(0, 10) ?? null;
    if (lastActive === today) {
      return { newStreak: user.streak || 0, alreadyDone: true };
    }

    const newStreak = lastActive === yesterday ? (user.streak || 0) + 1 : 1;
    db.prepare(`
      UPDATE users
      SET streak = ?, last_active = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(newStreak, userId);
    return { newStreak, alreadyDone: false };
  });
}

export async function updateStreak(userId: string): Promise<number> {
  return (await dailyCheckIn(userId)).newStreak;
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  return monday.toISOString().slice(0, 10);
}
