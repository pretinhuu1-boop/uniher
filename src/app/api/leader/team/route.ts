/**
 * GET /api/leader/team — líder vê colaboradoras do seu setor
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import type { AuthContext } from '@/lib/auth/middleware';
import { logAudit } from '@/lib/audit';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';
import { toSafeUserProjection } from '@/lib/gamification/containment';
import { z } from 'zod';

interface LeaderRecord {
  department_id: string | null;
  can_approve: number | null;
  company_id: string;
  role: 'lideranca';
}

interface TeamUserRow {
  id: string;
  name: string;
  email: string;
  nickname: string | null;
  role: 'colaboradora';
  blocked: number | null;
  approved: number | null;
  last_active: string | null;
  created_at: string | null;
  department_name: string | null;
}

interface LeaderApprovalTarget {
  id: string;
  department_id: string;
  company_id: string;
  name: string;
}

const LeaderTeamActionSchema = z.object({
  action: z.literal('approve'),
  targetUserId: z.string().min(1).max(128),
}).strict();

export const GET = withRole('lideranca')(async (_req: NextRequest, context: AuthContext) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;

  // Get leader's department
  const leader = db.prepare(`
    SELECT department_id, can_approve, company_id, role
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role = 'lideranca'
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(userId, companyId) as LeaderRecord | undefined;
  if (!leader) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
  }
  if (!leader?.department_id) {
    return NextResponse.json({ error: 'Sem setor vinculado', team: [], stats: null }, { status: 200 });
  }

  const team = db.prepare(`
    SELECT u.id, u.name, u.email, u.nickname, u.role,
           u.blocked, u.approved, u.last_active, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = u.company_id
    WHERE u.company_id = ? AND u.department_id = ? AND u.deleted_at IS NULL
    AND u.role = 'colaboradora'
    AND u.id != ?
    ORDER BY u.name ASC
  `).all(companyId, leader.department_id, userId) as TeamUserRow[];

  const stats = {
    total: team.length,
    active: team.filter((user) => !user.blocked).length,
    blocked: team.filter((user) => user.blocked).length,
    pendingApproval: team.filter((user) => !user.approved).length,
    canApprove: Boolean(leader.can_approve),
  };

  return NextResponse.json(toSafeUserProjection({ team, stats }));
});

/**
 * POST /api/leader/team — líder aprova colaboradora (se habilitado)
 */
export const POST = withRole('lideranca')(async (req: NextRequest, context: AuthContext) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  const body = await req.json().catch(() => ({}));
  const parsed = LeaderTeamActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Payload invalido' }, { status: 422 });
  }
  const { targetUserId } = parsed.data;

  // Check if leader can approve
  const leader = db.prepare(`
    SELECT department_id, can_approve, company_id, role
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role = 'lideranca'
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(userId, companyId) as LeaderRecord | undefined;
  if (!leader) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
  }
  if (!leader?.can_approve) {
    return NextResponse.json({ error: 'Sem permissão para aprovar. Solicite ao admin.' }, { status: 403 });
  }

  // Verify target is in same department
  const target = db.prepare(`
    SELECT id, department_id, company_id, name
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND department_id = ?
      AND role = 'colaboradora'
      AND deleted_at IS NULL
  `).get(targetUserId, companyId, leader.department_id) as LeaderApprovalTarget | undefined;
  if (!target) {
    return NextResponse.json({ error: 'Colaboradora não encontrada no seu setor' }, { status: 404 });
  }

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('UPDATE users SET approved = 1 WHERE id = ? AND company_id = ? AND department_id = ?')
      .run(targetUserId, companyId, leader.department_id);
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

  await logAudit({
    actorId: userId,
    actorEmail: userId,
    actorRole: 'lideranca',
    action: 'user_edit',
    entityType: 'user',
    entityId: target.id,
    entityLabel: target.name,
    details: {
      action: 'leader_team_approve',
      departmentId: leader.department_id,
    },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true });
});
