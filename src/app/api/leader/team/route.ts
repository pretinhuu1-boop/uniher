import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { getActiveLeaderApprover } from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const ApproveSchema = z.object({
  action: z.literal('approve'),
  targetUserId: z.string().min(1),
});

export const GET = withRole('lideranca')(async (
  _req: NextRequest,
  context,
) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  const leader = db.prepare(`
    SELECT department_id, can_approve
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role = 'lideranca'
      AND approved = 1
      AND blocked = 0
      AND deleted_at IS NULL
  `).get(userId, companyId) as {
    department_id: string | null;
    can_approve: number;
  } | undefined;
  if (!leader?.department_id) {
    return NextResponse.json(
      { error: 'Sem setor vinculado', team: [], stats: null },
      { status: 200 },
    );
  }

  const team = db.prepare(`
    SELECT u.id, u.name, u.email, u.nickname, u.role, u.level, u.points, u.streak,
           u.blocked, u.approved, u.last_active, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ?
      AND u.department_id = ?
      AND u.deleted_at IS NULL
      AND u.id != ?
    ORDER BY u.name ASC
  `).all(companyId, leader.department_id, userId) as Array<{
    blocked: number;
    approved: number;
  }>;

  const stats = {
    total: team.length,
    active: team.filter((user) => user.blocked === 0).length,
    blocked: team.filter((user) => user.blocked !== 0).length,
    pendingApproval: team.filter((user) => user.approved !== 1).length,
    canApprove: leader.can_approve === 1,
  };

  return NextResponse.json({ team, stats });
});

export const POST = withRole('lideranca')(async (
  req: NextRequest,
  context,
) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Acao invalida', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const companyId = context.auth.companyId;
  const targetUserId = parsed.data.targetUserId;
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => {
    const transaction = db.transaction(() => {
      const leader = getActiveLeaderApprover(
        db,
        context.auth.userId,
        companyId,
      );
      if (!leader) return 'invalid_actor' as const;

      const target = db.prepare(`
        SELECT id
        FROM users
        WHERE id = ?
          AND company_id = ?
          AND department_id = ?
          AND role = 'colaboradora'
          AND approved = 0
          AND blocked = 0
          AND deleted_at IS NULL
      `).get(targetUserId, companyId, leader.departmentId);
      if (!target) return 'invalid_target' as const;

      const approved = db.prepare(`
        UPDATE users
        SET approved = 1, updated_at = datetime('now')
        WHERE id = ?
          AND company_id = ?
          AND department_id = ?
          AND role = 'colaboradora'
          AND approved = 0
          AND blocked = 0
          AND deleted_at IS NULL
      `).run(targetUserId, companyId, leader.departmentId);
      if (approved.changes !== 1) return 'invalid_target' as const;

      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'system', ?, ?)
      `).run(
        nanoid(),
        targetUserId,
        'Cadastro aprovado!',
        'Sua gestora aprovou seu cadastro. Bem-vinda a plataforma!',
      );
      return 'approved' as const;
    });
    return transaction.immediate();
  }, 'approve leader team user', { retryOnFailure: false });

  if (outcome === 'invalid_actor') {
    return NextResponse.json(
      { error: 'Autorizacao da lideranca expirou' },
      { status: 409 },
    );
  }
  if (outcome === 'invalid_target') {
    return NextResponse.json(
      { error: 'Colaboradora nao encontrada no seu setor' },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
});
