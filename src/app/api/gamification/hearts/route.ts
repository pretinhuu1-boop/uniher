import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/gamification/hearts - Returns user's hearts with auto-refill
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const userId = auth.userId;
    const companyId = auth.companyId;

    // Check if hearts system is enabled
    const config = db.prepare(
      'SELECT hearts_enabled, hearts_per_day, hearts_refill_hours FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { hearts_enabled: number; hearts_per_day: number; hearts_refill_hours: number } | undefined;

    if (!config || !config.hearts_enabled) {
      return NextResponse.json({
        enabled: false,
        hearts: null,
        message: 'Sistema de vidas desabilitado',
      });
    }

    const maxHearts = config.hearts_per_day;
    const refillHours = config.hearts_refill_hours;

    // Get or create user hearts
    let userHearts = db.prepare(
      'SELECT * FROM user_hearts WHERE user_id = ?'
    ).get(userId) as { user_id: string; hearts: number; max_hearts: number; last_refill: string } | undefined;

    if (!userHearts) {
      // Create initial hearts record
      const writeQueue = getWriteQueue();
      await writeQueue.enqueue((wdb) => {
        wdb.prepare(
          'INSERT OR IGNORE INTO user_hearts (user_id, hearts, max_hearts) VALUES (?, ?, ?)'
        ).run(userId, maxHearts, maxHearts);
      });

      return NextResponse.json({
        enabled: true,
        hearts: maxHearts,
        maxHearts,
        nextRefillAt: null,
        fullHearts: true,
      });
    }

    // Check auto-refill
    const now = new Date();
    const lastRefill = new Date(userHearts.last_refill);
    const hoursSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60);

    let currentHearts = userHearts.hearts;
    let refilled = false;

    if (currentHearts < maxHearts && hoursSinceRefill >= refillHours) {
      // Refill hearts
      currentHearts = maxHearts;
      refilled = true;

      const writeQueue = getWriteQueue();
      await writeQueue.enqueue((wdb) => {
        wdb.prepare(
          `UPDATE user_hearts SET hearts = ?, max_hearts = ?, last_refill = datetime('now') WHERE user_id = ?`
        ).run(maxHearts, maxHearts, userId);
      });
    }

    // Calculate next refill time
    let nextRefillAt = null;
    if (currentHearts < maxHearts) {
      const nextRefillDate = new Date(lastRefill.getTime() + refillHours * 60 * 60 * 1000);
      nextRefillAt = nextRefillDate.toISOString();
    }

    return NextResponse.json({
      enabled: true,
      hearts: currentHearts,
      maxHearts,
      nextRefillAt,
      fullHearts: currentHearts >= maxHearts,
      refilled,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
