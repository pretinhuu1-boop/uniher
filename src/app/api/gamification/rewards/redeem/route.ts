import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

const redeemSchema = z.object({
  rewardId: z.string().min(1, 'rewardId obrigatorio'),
});

// POST /api/gamification/rewards/redeem - Collaborator redeems a reward
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { rewardId } = parsed.data;
    const userId = auth.userId;
    const companyId = auth.companyId;
    const db = getReadDb();

    // Verify reward exists and belongs to company
    const reward = db.prepare(
      'SELECT * FROM rewards WHERE id = ? AND company_id = ? AND active = 1'
    ).get(rewardId, companyId) as { id: string; title: string; points_cost: number; quantity_available: number } | undefined;

    if (!reward) {
      return NextResponse.json({ error: 'Recompensa nao encontrada ou indisponivel' }, { status: 404 });
    }

    // Check quantity
    if (reward.quantity_available === 0) {
      return NextResponse.json({ error: 'Recompensa esgotada' }, { status: 422 });
    }

    // Check user points
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined;
    if (!user || user.points < reward.points_cost) {
      return NextResponse.json({
        error: 'Pontos insuficientes',
        required: reward.points_cost,
        available: user?.points ?? 0,
      }, { status: 422 });
    }

    const redemptionId = nanoid();
    const writeQueue = getWriteQueue();

    await writeQueue.enqueue((wdb) => {
      // Deduct points
      wdb.prepare(
        `UPDATE users SET points = points - ?, updated_at = datetime('now') WHERE id = ?`
      ).run(reward.points_cost, userId);

      // Decrease quantity if not unlimited
      if (reward.quantity_available > 0) {
        wdb.prepare(
          'UPDATE rewards SET quantity_available = quantity_available - 1 WHERE id = ?'
        ).run(rewardId);
      }

      // Create redemption record
      wdb.prepare(
        `INSERT INTO reward_redemptions (id, user_id, reward_id, points_spent, status)
         VALUES (?, ?, ?, ?, 'pending')`
      ).run(redemptionId, userId, rewardId, reward.points_cost);

      // Activity log
      wdb.prepare(
        `INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned)
         VALUES (?, ?, 'redeem_reward', 'reward', ?, ?)`
      ).run(nanoid(), userId, rewardId, -reward.points_cost);
    });

    return NextResponse.json({
      success: true,
      redemptionId,
      rewardTitle: reward.title,
      pointsSpent: reward.points_cost,
      remainingPoints: user.points - reward.points_cost,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
