/**
 * PATCH /api/rh/users/[id] — update user (block/unblock, change department, change role)
 * Protected: withRole('rh')
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { logAudit } from '@/lib/audit';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const PatchSchema = z.object({
  action: z.enum(['block', 'unblock', 'change_department', 'change_role']),
  department_id: z.string().optional().nullable(),
  role: z.enum(['lideranca', 'colaboradora']).optional(),
});

export const PATCH = withRole('rh')(async (req: NextRequest, context) => {
  await checkAdminRateLimit(req);
  await initDb();

  const params = await context.params;
  const userId = params.id;
  const db = getReadDb();
  const companyId = context.auth.companyId;

  if (!companyId) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });
  }

  // Verify user belongs to same company
  const targetUser = db.prepare(
    'SELECT id, name, email, role, company_id, blocked FROM users WHERE id = ? AND deleted_at IS NULL'
  ).get(userId) as any;

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  if (targetUser.company_id !== companyId) {
    return NextResponse.json({ error: 'Usuário não pertence à sua empresa' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { action, department_id, role } = parsed.data;
  const wq = getWriteQueue();
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  switch (action) {
    case 'block': {
      if (targetUser.role === 'rh' || targetUser.role === 'admin') {
        return NextResponse.json({ error: 'Não é possível bloquear este usuário' }, { status: 403 });
      }
      await wq.enqueue((db) => {
        db.prepare('UPDATE users SET blocked = 1, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: 'rh',
        action: 'user_block',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser.name,
        details: { email: targetUser.email },
        ip,
      });
      break;
    }
    case 'unblock': {
      await wq.enqueue((db) => {
        db.prepare('UPDATE users SET blocked = 0, updated_at = datetime(\'now\') WHERE id = ?').run(userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: 'rh',
        action: 'user_unblock',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser.name,
        details: { email: targetUser.email },
        ip,
      });
      break;
    }
    case 'change_department': {
      // Validate department belongs to same company
      if (department_id) {
        const dept = db.prepare('SELECT id FROM departments WHERE id = ? AND company_id = ?').get(department_id, companyId);
        if (!dept) {
          return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 });
        }
      }
      await wq.enqueue((db) => {
        db.prepare('UPDATE users SET department_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(department_id || null, userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: 'rh',
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser.name,
        details: { action: 'change_department', department_id },
        ip,
      });
      break;
    }
    case 'change_role': {
      if (!role) {
        return NextResponse.json({ error: 'Role é obrigatório' }, { status: 422 });
      }
      // Cannot change to rh or admin
      if (targetUser.role === 'rh' || targetUser.role === 'admin') {
        return NextResponse.json({ error: 'Não é possível alterar o papel deste usuário' }, { status: 403 });
      }
      await wq.enqueue((db) => {
        db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: 'rh',
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser.name,
        details: { action: 'change_role', from: targetUser.role, to: role },
        ip,
      });
      break;
    }
  }

  return NextResponse.json({ success: true });
});
