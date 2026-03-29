import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth, withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// GET /api/gamification/rewards - List rewards for user's company
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const companyId = auth.companyId;
    const isAdmin = auth.role === 'admin' || auth.role === 'rh';

    let rewards;
    if (isAdmin) {
      // Admin/RH sees all rewards (active and inactive)
      rewards = db.prepare(
        `SELECT r.*,
                (SELECT COUNT(*) FROM reward_redemptions rr WHERE rr.reward_id = r.id) as total_redemptions,
                (SELECT COUNT(*) FROM reward_redemptions rr WHERE rr.reward_id = r.id AND rr.status = 'pending') as pending_redemptions
         FROM rewards r
         WHERE r.company_id = ?
         ORDER BY r.created_at DESC`
      ).all(companyId);
    } else {
      // Collaborators see only active rewards
      rewards = db.prepare(
        `SELECT r.id, r.title, r.description, r.points_cost, r.type, r.quantity_available, r.active
         FROM rewards r
         WHERE r.company_id = ? AND r.active = 1
         ORDER BY r.points_cost ASC`
      ).all(companyId);
    }

    // Get user's current points
    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(auth.userId) as { points: number } | undefined;

    return NextResponse.json({
      rewards,
      userPoints: user?.points ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

const createRewardSchema = z.object({
  title: z.string().min(1, 'Titulo obrigatorio').max(200),
  description: z.string().max(1000).optional(),
  points_cost: z.number().min(1, 'Custo minimo 1 ponto'),
  type: z.enum(['voucher', 'folga', 'produto', 'experiencia']).optional().default('voucher'),
  quantity_available: z.number().min(-1).optional().default(-1),
  active: z.number().min(0).max(1).optional().default(1),
});

// POST /api/gamification/rewards - Admin creates new reward
export const POST = withRole('admin', 'rh')(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = createRewardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { title, description, points_cost, type, quantity_available, active } = parsed.data;
    const companyId = auth.companyId;
    const id = nanoid();

    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      wdb.prepare(
        `INSERT INTO rewards (id, company_id, title, description, points_cost, type, quantity_available, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, companyId, title, description || null, points_cost, type, quantity_available, active);
    });

    return NextResponse.json({ id, title, description, points_cost, type, quantity_available, active, company_id: companyId }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
