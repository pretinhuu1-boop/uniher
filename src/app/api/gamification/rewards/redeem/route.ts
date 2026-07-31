import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

const redeemSchema = z.object({
  rewardId: z.string().min(1, 'rewardId obrigatorio'),
});

export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const parsed = redeemSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { rewardId } = parsed.data;
    const userId = auth.userId;
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 400 },
      );
    }

    const redemptionId = nanoid();
    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((db) => {
      const redeem = db.transaction(() => {
        const user = db.prepare(`
          SELECT u.points
          FROM users u
          JOIN companies c ON c.id = u.company_id
          WHERE u.id = ?
            AND u.company_id = ?
            AND u.approved = 1
            AND u.blocked = 0
            AND u.deleted_at IS NULL
            AND c.is_active = 1
            AND c.deleted_at IS NULL
        `).get(userId, companyId) as { points: number } | undefined;
        if (!user) return { status: 'invalid_actor' as const };

        const reward = db.prepare(`
          SELECT id, title, points_cost, quantity_available
          FROM rewards
          WHERE id = ? AND company_id = ? AND active = 1
        `).get(rewardId, companyId) as {
          id: string;
          title: string;
          points_cost: number;
          quantity_available: number;
        } | undefined;
        if (!reward) return { status: 'not_found' as const };
        if (reward.quantity_available === 0) {
          return { status: 'out_of_stock' as const };
        }
        if (user.points < reward.points_cost) {
          return {
            status: 'insufficient_points' as const,
            required: reward.points_cost,
            available: user.points,
          };
        }

        const deducted = db.prepare(`
          UPDATE users
          SET points = points - ?, updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND approved = 1
            AND blocked = 0
            AND deleted_at IS NULL
            AND points >= ?
        `).run(
          reward.points_cost,
          userId,
          companyId,
          reward.points_cost,
        );
        if (deducted.changes !== 1) {
          throw new Error('REWARD_POINTS_CHANGED');
        }

        if (reward.quantity_available > 0) {
          const reserved = db.prepare(`
            UPDATE rewards
            SET quantity_available = quantity_available - 1
            WHERE id = ?
              AND company_id = ?
              AND active = 1
              AND quantity_available > 0
          `).run(rewardId, companyId);
          if (reserved.changes !== 1) {
            throw new Error('REWARD_STOCK_CHANGED');
          }
        }

        db.prepare(`
          INSERT INTO reward_redemptions (
            id, user_id, reward_id, points_spent, status
          )
          VALUES (?, ?, ?, ?, 'pending')
        `).run(redemptionId, userId, rewardId, reward.points_cost);
        db.prepare(`
          INSERT INTO activity_log (
            id, user_id, action, target_type, target_id, points_earned
          )
          VALUES (?, ?, 'redeem_reward', 'reward', ?, ?)
        `).run(nanoid(), userId, rewardId, -reward.points_cost);

        return {
          status: 'redeemed' as const,
          rewardTitle: reward.title,
          pointsSpent: reward.points_cost,
          remainingPoints: user.points - reward.points_cost,
        };
      });
      return redeem.immediate();
    }, 'redeem reward atomically', { retryOnFailure: false });

    if (outcome.status === 'invalid_actor') {
      return NextResponse.json(
        { error: 'Sessao ou empresa nao esta ativa' },
        { status: 409 },
      );
    }
    if (outcome.status === 'not_found') {
      return NextResponse.json(
        { error: 'Recompensa nao encontrada ou indisponivel' },
        { status: 404 },
      );
    }
    if (outcome.status === 'out_of_stock') {
      return NextResponse.json(
        { error: 'Recompensa esgotada' },
        { status: 422 },
      );
    }
    if (outcome.status === 'insufficient_points') {
      return NextResponse.json({
        error: 'Pontos insuficientes',
        required: outcome.required,
        available: outcome.available,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      redemptionId,
      rewardTitle: outcome.rewardTitle,
      pointsSpent: outcome.pointsSpent,
      remainingPoints: outcome.remainingPoints,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
