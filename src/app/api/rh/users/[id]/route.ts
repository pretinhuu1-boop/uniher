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
import { createAchievementsRepository } from '@/repositories/achievements.repository';
import { createChallengesRepository } from '@/repositories/challenges.repository';
import { createObjectivesRepository } from '@/repositories/objectives.repository';
import { createParticipationRepository } from '@/repositories/participation.repository';
import { z } from 'zod';

const PatchSchema = z.object({
  action: z.enum(['block', 'unblock', 'change_department', 'change_role', 'update_profile', 'reset_password', 'soft_delete']),
  department_id: z.string().optional().nullable(),
  role: z.enum(['lideranca', 'colaboradora']).optional(),
  name: z.string().min(2).max(100).optional(),
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

  const actor = db.prepare(`
    SELECT id, company_id, role
    FROM users
    WHERE id = ?
      AND company_id = ?
      AND role = 'rh'
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(context.auth.userId, companyId) as { id: string; company_id: string; role: string } | undefined;
  if (!actor || actor.role !== context.auth.role) {
    return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
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

  const { action, department_id, role, name } = parsed.data;
  const wq = getWriteQueue();
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  if ((action === 'change_department' || (action === 'update_profile' && department_id !== undefined)) && department_id) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ? AND company_id = ?').get(department_id, companyId);
    if (!dept) {
      return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 });
    }
  }

  switch (action) {
    case 'block': {
      if (targetUser.role === 'rh' || targetUser.role === 'admin') {
        return NextResponse.json({ error: 'Não é possível bloquear este usuário' }, { status: 403 });
      }
      await wq.enqueue((db) => {
        db.prepare('UPDATE users SET blocked = 1, updated_at = datetime(\'now\') WHERE id = ? AND company_id = ?')
          .run(userId, companyId);
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
        db.prepare('UPDATE users SET blocked = 0, updated_at = datetime(\'now\') WHERE id = ? AND company_id = ?')
          .run(userId, companyId);
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
        db.prepare('UPDATE users SET department_id = ?, updated_at = datetime(\'now\') WHERE id = ? AND company_id = ?')
          .run(department_id || null, userId, companyId);
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
        db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ? AND company_id = ?')
          .run(role, userId, companyId);
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
    case 'update_profile': {
      const updates: string[] = ["updated_at = datetime('now')"];
      const values: any[] = [];
      if (name) { updates.push('name = ?'); values.push(name); }
      if (role && ['lideranca', 'colaboradora'].includes(role) && targetUser.role !== 'rh') {
        updates.push('role = ?'); values.push(role);
      }
      if (department_id !== undefined) {
        updates.push('department_id = ?'); values.push(department_id || null);
      }
      values.push(userId, companyId);
      await wq.enqueue((db) => {
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`).run(...values);
      });
      await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'user_edit', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: { action: 'update_profile', changes: body }, ip });
      break;
    }
    case 'reset_password': {
      const { hashPassword } = await import('@/lib/auth/password');
      const { nanoid } = await import('nanoid');
      const resetSecret = `${nanoid(12)}A1a@`;
      const hash = await hashPassword(resetSecret);
      await wq.enqueue((db) => {
        db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ? AND company_id = ?")
          .run(hash, userId, companyId);
      });
      await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'password_reset', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: {}, ip });
      return NextResponse.json({
        success: true,
        message: 'Senha redefinida. Entrega segura obrigatória fora da resposta.',
        passwordReset: {
          delivery: 'out_of_band_required',
          mustChangePassword: true,
        },
      });
    }
    case 'soft_delete': {
      if (targetUser.role === 'rh' || targetUser.role === 'admin') {
        return NextResponse.json({ error: 'Não é possível remover este usuário' }, { status: 403 });
      }
      await wq.enqueue((db) => {
        const removeUser = db.transaction(() => {
          createAchievementsRepository(db).hardDeleteUserAchievementsInCurrentTransaction({
            userId,
            companyId,
          });
          createChallengesRepository(db).hardDeleteUserChallengesInCurrentTransaction({
            userId,
            companyId,
          });
          createObjectivesRepository(db).hardDeleteUserObjectivesInCurrentTransaction({
            userId,
            companyId,
          });
          createParticipationRepository(db).hardDeleteUserEventsInCurrentTransaction({
            userId,
            companyId,
            actorId: context.auth.userId,
            erasedAt: new Date().toISOString(),
          });
          db.prepare("UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND company_id = ?")
            .run(userId, companyId);
        });
        removeUser.immediate();
      });
      await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'user_delete', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: { soft: true }, ip });
      break;
    }
  }

  return NextResponse.json({ success: true });
});
