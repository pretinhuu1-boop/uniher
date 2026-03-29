/**
 * GET /api/leader/team — líder vê colaboradoras do seu setor
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';

export const GET = withRole('lideranca')(async (_req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;

  // Get leader's department
  const leader = db.prepare('SELECT department_id, can_approve FROM users WHERE id = ?').get(userId) as any;
  if (!leader?.department_id) {
    return NextResponse.json({ error: 'Sem setor vinculado', team: [], stats: null }, { status: 200 });
  }

  const team = db.prepare(`
    SELECT u.id, u.name, u.email, u.nickname, u.role, u.level, u.points, u.streak,
           u.blocked, u.approved, u.last_active, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ? AND u.department_id = ? AND u.deleted_at IS NULL
    AND u.id != ?
    ORDER BY u.name ASC
  `).all(companyId, leader.department_id, userId);

  const stats = {
    total: team.length,
    active: team.filter((u: any) => !u.blocked).length,
    blocked: team.filter((u: any) => u.blocked).length,
    pendingApproval: team.filter((u: any) => !u.approved).length,
    canApprove: Boolean(leader.can_approve),
  };

  return NextResponse.json({ team, stats });
});

/**
 * POST /api/leader/team — líder aprova colaboradora (se habilitado)
 */
export const POST = withRole('lideranca')(async (req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;
  const body = await req.json();
  const { action, targetUserId } = body;

  // Check if leader can approve
  const leader = db.prepare('SELECT department_id, can_approve FROM users WHERE id = ?').get(userId) as any;
  if (!leader?.can_approve) {
    return NextResponse.json({ error: 'Sem permissão para aprovar. Solicite ao admin.' }, { status: 403 });
  }

  // Verify target is in same department
  const target = db.prepare('SELECT id, department_id, company_id FROM users WHERE id = ? AND deleted_at IS NULL').get(targetUserId) as any;
  if (!target || target.department_id !== leader.department_id) {
    return NextResponse.json({ error: 'Colaboradora não encontrada no seu setor' }, { status: 404 });
  }

  if (action === 'approve') {
    const wq = getWriteQueue();
    await wq.enqueue((db) => {
      db.prepare('UPDATE users SET approved = 1 WHERE id = ?').run(targetUserId);
    });

    // Notify the approved user
    try {
      const wq2 = getWriteQueue();
      await wq2.enqueue((db) => {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message)
          VALUES (?, ?, 'system', 'Cadastro aprovado! 🎉', 'Sua gestora aprovou seu cadastro. Bem-vinda à plataforma!')
        `).run(nanoid(), targetUserId);
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
});
