import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/gamification/rewards/redemptions - List redemptions
export const GET = withAuth(async (req: NextRequest, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const companyId = auth.companyId;
    const isAdmin = auth.role === 'admin' || auth.role === 'rh';

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    if (isAdmin) {
      // Admin sees all redemptions for the company
      const whereClause = status
        ? 'AND rr.status = ?'
        : '';
      const params: unknown[] = status
        ? [companyId, status, limit, offset]
        : [companyId, limit, offset];

      const redemptions = db.prepare(
        `SELECT rr.*, r.title as reward_title, r.type as reward_type, r.points_cost,
                u.name as user_name, u.email as user_email
         FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         JOIN users u ON u.id = rr.user_id
         WHERE r.company_id = ? ${whereClause}
         ORDER BY rr.created_at DESC
         LIMIT ? OFFSET ?`
      ).all(...params);

      const countParams: unknown[] = status ? [companyId, status] : [companyId];
      const total = (db.prepare(
        `SELECT COUNT(*) as count FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         WHERE r.company_id = ? ${whereClause}`
      ).get(...countParams) as { count: number }).count;

      return NextResponse.json({
        redemptions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } else {
      // Collaborator sees own redemptions
      const redemptions = db.prepare(
        `SELECT rr.*, r.title as reward_title, r.type as reward_type, r.points_cost
         FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         WHERE rr.user_id = ?
         ORDER BY rr.created_at DESC
         LIMIT ? OFFSET ?`
      ).all(auth.userId, limit, offset);

      const total = (db.prepare(
        `SELECT COUNT(*) as count FROM reward_redemptions WHERE user_id = ?`
      ).get(auth.userId) as { count: number }).count;

      return NextResponse.json({
        redemptions,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
});

const patchRedemptionSchema = z.object({
  redemptionId: z.string().min(1, 'redemptionId obrigatorio'),
  status: z.enum(['approved', 'delivered', 'rejected']),
  note: z.string().max(500).optional(),
});

// PATCH /api/gamification/rewards/redemptions - Admin approves/rejects redemption
export const PATCH = withAuth(async (req, { auth }) => {
  try {
    if (auth.role !== 'admin' && auth.role !== 'rh') {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }

    await initDb();
    const body = await req.json();
    const parsed = patchRedemptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { redemptionId, status, note } = parsed.data;
    const companyId = auth.companyId;
    const db = getReadDb();

    // Verify redemption exists and belongs to company
    const redemption = db.prepare(
      `SELECT rr.*, r.company_id, r.title as reward_title
       FROM reward_redemptions rr
       JOIN rewards r ON r.id = rr.reward_id
       WHERE rr.id = ?`
    ).get(redemptionId) as { id: string; user_id: string; reward_id: string; points_spent: number; status: string; company_id: string; reward_title: string } | undefined;

    if (!redemption) {
      return NextResponse.json({ error: 'Resgate nao encontrado' }, { status: 404 });
    }

    if (redemption.company_id !== companyId) {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }

    if (redemption.status !== 'pending') {
      return NextResponse.json({ error: `Resgate ja esta com status: ${redemption.status}` }, { status: 409 });
    }

    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      // Update redemption status
      wdb.prepare(
        `UPDATE reward_redemptions SET status = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`
      ).run(status, auth.userId, redemptionId);

      // If rejected, refund points
      if (status === 'rejected') {
        wdb.prepare(
          `UPDATE users SET points = points + ?, updated_at = datetime('now') WHERE id = ?`
        ).run(redemption.points_spent, redemption.user_id);

        // Restore quantity if not unlimited
        const reward = wdb.prepare('SELECT quantity_available FROM rewards WHERE id = ?').get(redemption.reward_id) as { quantity_available: number } | undefined;
        if (reward && reward.quantity_available >= 0) {
          wdb.prepare('UPDATE rewards SET quantity_available = quantity_available + 1 WHERE id = ?').run(redemption.reward_id);
        }

        // Activity log
        wdb.prepare(
          `INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned)
           VALUES (?, ?, 'refund_reward', 'reward_redemption', ?, ?)`
        ).run(nanoid(), redemption.user_id, redemptionId, redemption.points_spent);
      }

      // Notify user
      const message = status === 'approved'
        ? `Seu resgate de "${redemption.reward_title}" foi aprovado!`
        : status === 'rejected'
          ? `Seu resgate de "${redemption.reward_title}" foi recusado.${note ? ` Motivo: ${note}` : ''} Seus pontos foram devolvidos.`
          : `Sua recompensa "${redemption.reward_title}" foi entregue!`;

      wdb.prepare(
        `INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'reward', ?, ?)`
      ).run(nanoid(), redemption.user_id, 'Atualização de resgate', message);
    });

    return NextResponse.json({ success: true, redemptionId, newStatus: status });
  } catch (error) {
    return handleApiError(error);
  }
});
