import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// POST /api/gamification/streak/check - Check and update streak status
export const POST = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const userId = auth.userId;

    const user = db.prepare(
      'SELECT streak, last_active, points, level FROM users WHERE id = ?'
    ).get(userId) as { streak: number; last_active: string | null; points: number; level: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastActiveDate = user.last_active ? user.last_active.split('T')[0] : null;

    let currentStreak = user.streak || 0;
    let streakLost = false;
    let streakFrozen = false;

    // If already active today, nothing to do
    if (lastActiveDate === today) {
      // Get longest streak
      const longest = db.prepare(
        'SELECT MAX(streak_count) as max_streak FROM streak_history WHERE user_id = ?'
      ).get(userId) as { max_streak: number | null } | undefined;

      return NextResponse.json({
        currentStreak,
        longestStreak: Math.max(currentStreak, longest?.max_streak ?? 0),
        streakLost: false,
        streakFrozen: false,
        checkedToday: true,
      });
    }

    // If last active was yesterday, streak continues (will be incremented on check-in)
    if (lastActiveDate === yesterday) {
      const longest = db.prepare(
        'SELECT MAX(streak_count) as max_streak FROM streak_history WHERE user_id = ?'
      ).get(userId) as { max_streak: number | null } | undefined;

      return NextResponse.json({
        currentStreak,
        longestStreak: Math.max(currentStreak, longest?.max_streak ?? 0),
        streakLost: false,
        streakFrozen: false,
        checkedToday: false,
      });
    }

    // Missed yesterday - check for streak freeze
    if (currentStreak > 0 && lastActiveDate !== null) {
      const freeze = db.prepare(
        'SELECT quantity FROM streak_freezes WHERE user_id = ?'
      ).get(userId) as { quantity: number } | undefined;

      if (freeze && freeze.quantity > 0) {
        // Use a freeze - streak preserved
        streakFrozen = true;
        const writeQueue = getWriteQueue();
        await writeQueue.enqueue((wdb) => {
          wdb.prepare(
            `UPDATE streak_freezes SET quantity = quantity - 1, updated_at = datetime('now') WHERE user_id = ?`
          ).run(userId);
        });
      } else {
        // No freeze available - lose streak
        streakLost = true;
        const lostStreak = currentStreak;
        currentStreak = 0;

        const writeQueue = getWriteQueue();
        await writeQueue.enqueue((wdb) => {
          // Save to streak history
          wdb.prepare(
            `INSERT INTO streak_history (id, user_id, streak_count, lost_at, reason) VALUES (?, ?, ?, datetime('now'), 'missed_day')`
          ).run(nanoid(), userId, lostStreak);

          // Reset streak on user
          wdb.prepare(
            `UPDATE users SET streak = 0, updated_at = datetime('now') WHERE id = ?`
          ).run(userId);

          // Notify user
          wdb.prepare(
            `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'streak', ?, ?)`
          ).run(
            nanoid(), userId,
            'Sequencia perdida',
            `Sua sequencia de ${lostStreak} dias foi perdida. Comece uma nova hoje!`
          );
        });
      }
    }

    // Get longest streak
    const longest = db.prepare(
      'SELECT MAX(streak_count) as max_streak FROM streak_history WHERE user_id = ?'
    ).get(userId) as { max_streak: number | null } | undefined;

    // Get streak freeze count
    const freezes = db.prepare(
      'SELECT quantity FROM streak_freezes WHERE user_id = ?'
    ).get(userId) as { quantity: number } | undefined;

    return NextResponse.json({
      currentStreak,
      longestStreak: Math.max(currentStreak, longest?.max_streak ?? 0),
      streakLost,
      streakFrozen,
      freezesRemaining: freezes?.quantity ?? 0,
      checkedToday: false,
    });
  } catch (error) {
    console.error('[Streak Check] Error:', error);
    return handleApiError(error);
  }
});
