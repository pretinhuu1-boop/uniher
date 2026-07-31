import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import {
  runAsActiveMasterAdminActor,
  runAsActiveRhActor,
} from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';

export const GET = withAuth(async (req: NextRequest, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const companyId = auth.companyId;
    const isManager = auth.role === 'admin' || auth.role === 'rh';
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get('limit') || '20')),
    );
    const offset = (page - 1) * limit;

    if (isManager) {
      const whereClause = status ? 'AND rr.status = ?' : '';
      const params: unknown[] = status
        ? [companyId, status, limit, offset]
        : [companyId, limit, offset];
      const redemptions = db.prepare(`
        SELECT
          rr.*,
          r.title as reward_title,
          r.type as reward_type,
          r.points_cost,
          u.name as user_name,
          u.email as user_email
        FROM reward_redemptions rr
        JOIN rewards r ON r.id = rr.reward_id
        JOIN users u ON u.id = rr.user_id
        WHERE r.company_id = ? ${whereClause}
        ORDER BY rr.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params);
      const countParams: unknown[] = status
        ? [companyId, status]
        : [companyId];
      const total = (db.prepare(`
        SELECT COUNT(*) as count
        FROM reward_redemptions rr
        JOIN rewards r ON r.id = rr.reward_id
        WHERE r.company_id = ? ${whereClause}
      `).get(...countParams) as { count: number }).count;
      return NextResponse.json({
        redemptions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }

    const redemptions = db.prepare(`
      SELECT
        rr.*,
        r.title as reward_title,
        r.type as reward_type,
        r.points_cost
      FROM reward_redemptions rr
      JOIN rewards r ON r.id = rr.reward_id
      WHERE rr.user_id = ?
      ORDER BY rr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(auth.userId, limit, offset);
    const total = (db.prepare(`
      SELECT COUNT(*) as count
      FROM reward_redemptions
      WHERE user_id = ?
    `).get(auth.userId) as { count: number }).count;
    return NextResponse.json({
      redemptions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleApiError(error);
  }
});

const patchRedemptionSchema = z.object({
  redemptionId: z.string().min(1, 'redemptionId obrigatorio'),
  status: z.enum(['approved', 'delivered', 'rejected']),
  note: z.string().max(500).optional(),
});

export const PATCH = withAuth(async (req, { auth }) => {
  try {
    if (auth.role !== 'admin' && auth.role !== 'rh') {
      return NextResponse.json(
        { error: 'Permissao insuficiente' },
        { status: 403 },
      );
    }

    await initDb();
    const parsed = patchRedemptionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { redemptionId, status, note } = parsed.data;
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: 'Empresa nao encontrada' },
        { status: 400 },
      );
    }

    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((db) => {
      const processRedemption = () => {
        const redemption = db.prepare(`
          SELECT
            rr.id,
            rr.user_id,
            rr.reward_id,
            rr.points_spent,
            rr.status,
            r.title AS reward_title,
            r.quantity_available
          FROM reward_redemptions rr
          JOIN rewards r
            ON r.id = rr.reward_id
           AND r.company_id = ?
          JOIN users u
            ON u.id = rr.user_id
           AND u.company_id = ?
           AND u.deleted_at IS NULL
          WHERE rr.id = ?
        `).get(companyId, companyId, redemptionId) as {
          id: string;
          user_id: string;
          reward_id: string;
          points_spent: number;
          status: string;
          reward_title: string;
          quantity_available: number;
        } | undefined;
        if (!redemption) return { status: 'not_found' as const };
        if (redemption.status !== 'pending') {
          return {
            status: 'already_processed' as const,
            currentStatus: redemption.status,
          };
        }

        const updated = db.prepare(`
          UPDATE reward_redemptions
          SET status = ?, approved_by = ?, approved_at = datetime('now')
          WHERE id = ? AND status = 'pending'
        `).run(status, auth.userId, redemptionId);
        if (updated.changes !== 1) {
          return {
            status: 'already_processed' as const,
            currentStatus: 'changed',
          };
        }

        if (status === 'rejected') {
          const refunded = db.prepare(`
            UPDATE users
            SET points = points + ?, updated_at = datetime('now')
            WHERE id = ? AND company_id = ? AND deleted_at IS NULL
          `).run(redemption.points_spent, redemption.user_id, companyId);
          if (refunded.changes !== 1) {
            throw new Error('REDEMPTION_USER_CHANGED');
          }
          if (redemption.quantity_available >= 0) {
            db.prepare(`
              UPDATE rewards
              SET quantity_available = quantity_available + 1
              WHERE id = ? AND company_id = ?
            `).run(redemption.reward_id, companyId);
          }
          db.prepare(`
            INSERT INTO activity_log (
              id, user_id, action, target_type, target_id, points_earned
            )
            VALUES (?, ?, 'refund_reward', 'reward_redemption', ?, ?)
          `).run(
            nanoid(),
            redemption.user_id,
            redemptionId,
            redemption.points_spent,
          );
        }

        const message = status === 'approved'
          ? `Seu resgate de "${redemption.reward_title}" foi aprovado!`
          : status === 'rejected'
            ? `Seu resgate de "${redemption.reward_title}" foi recusado.${note ? ` Motivo: ${note}` : ''} Seus pontos foram devolvidos.`
            : `Sua recompensa "${redemption.reward_title}" foi entregue!`;
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message)
          VALUES (?, ?, 'reward', ?, ?)
        `).run(
          nanoid(),
          redemption.user_id,
          'Atualizacao de resgate',
          message,
        );
        return { status: 'processed' as const };
      };

      return auth.role === 'admin'
        ? runAsActiveMasterAdminActor(db, auth.userId, processRedemption)
        : runAsActiveRhActor(db, auth.userId, companyId, processRedemption);
    }, 'process reward redemption', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json(
        { error: 'Autorizacao para processar resgate expirou' },
        { status: 409 },
      );
    }
    if (outcome.value.status === 'not_found') {
      return NextResponse.json(
        { error: 'Resgate nao encontrado' },
        { status: 404 },
      );
    }
    if (outcome.value.status === 'already_processed') {
      return NextResponse.json(
        { error: `Resgate ja esta com status: ${outcome.value.currentStatus}` },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, redemptionId, newStatus: status });
  } catch (error) {
    return handleApiError(error);
  }
});
