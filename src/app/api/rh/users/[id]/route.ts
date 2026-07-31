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
import { requestUserPasswordReset } from '@/lib/auth/request-user-password-reset';

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
  if (targetUser.role === 'rh' || targetUser.role === 'admin') {
    return NextResponse.json(
      { error: 'Nao e possivel alterar este usuario' },
      { status: 403 },
    );
  }

  const { action, department_id, role } = parsed.data;
  const wq = getWriteQueue();
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  switch (action) {
    case 'block': {
      const blocked = await wq.enqueue((db) => {
        const blockUser = db.transaction(() => db.prepare(`
          UPDATE users
          SET blocked = 1, updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(userId, companyId).changes === 1);
        return blockUser.immediate();
      }, 'block RH company user', { retryOnFailure: false });
      if (!blocked) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 409 });
      }
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
      const unblocked = await wq.enqueue((db) => {
        const unblockUser = db.transaction(() => db.prepare(`
          UPDATE users
          SET blocked = 0, updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(userId, companyId).changes === 1);
        return unblockUser.immediate();
      }, 'unblock RH company user', { retryOnFailure: false });
      if (!unblocked) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 409 });
      }
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
      const changed = await wq.enqueue((db) => {
        const changeDepartment = db.transaction(() => {
          if (department_id) {
            const department = db.prepare(`
              SELECT id FROM departments WHERE id = ? AND company_id = ?
            `).get(department_id, companyId);
            if (!department) return false;
          }
          const result = db.prepare(`
            UPDATE users
            SET department_id = ?, updated_at = datetime('now')
            WHERE id = ?
              AND company_id = ?
              AND role IN ('lideranca', 'colaboradora')
              AND deleted_at IS NULL
          `).run(department_id || null, userId, companyId);
          return result.changes === 1;
        });
        return changeDepartment.immediate();
      }, 'change RH user department', { retryOnFailure: false });
      if (!changed) {
        return NextResponse.json(
          { error: 'Usuario ou departamento nao encontrado' },
          { status: 409 },
        );
      }
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
      const roleChanged = await wq.enqueue((db) => {
        const changeRole = db.transaction(() => db.prepare(`
          UPDATE users
          SET role = ?, updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(role, userId, companyId).changes === 1);
        return changeRole.immediate();
      }, 'change RH company user role', { retryOnFailure: false });
      if (!roleChanged) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 409 });
      }
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
      if (body.department_id) {
        const department = db.prepare(
          'SELECT id FROM departments WHERE id = ? AND company_id = ?',
        ).get(body.department_id, companyId);
        if (!department) {
          return NextResponse.json(
            { error: 'Departamento nao encontrado' },
            { status: 404 },
          );
        }
      }
      const updates: string[] = ["updated_at = datetime('now')"];
      const values: any[] = [];
      if (body.name) { updates.push('name = ?'); values.push(body.name); }
      if (body.role && ['lideranca', 'colaboradora'].includes(body.role) && targetUser.role !== 'rh') {
        updates.push('role = ?'); values.push(body.role);
      }
      if (body.department_id !== undefined) {
        updates.push('department_id = ?'); values.push(body.department_id || null);
      }
      values.push(userId);
      const updated = await wq.enqueue((db) => {
        const updateProfile = db.transaction(() => {
          if (body.department_id) {
            const department = db.prepare(
              'SELECT id FROM departments WHERE id = ? AND company_id = ?',
            ).get(body.department_id, companyId);
            if (!department) return false;
          }
          const result = db.prepare(`
            UPDATE users
            SET ${updates.join(', ')}
            WHERE id = ?
              AND company_id = ?
              AND role IN ('lideranca', 'colaboradora')
              AND deleted_at IS NULL
          `).run(...values.slice(0, -1), userId, companyId);
          return result.changes === 1;
        });
        return updateProfile.immediate();
      }, 'update RH user profile', { retryOnFailure: false });
      if (!updated) {
        return NextResponse.json(
          { error: 'Usuario ou departamento nao encontrado' },
          { status: 409 },
        );
      }
      await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'user_edit', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: { action: 'update_profile', changes: body }, ip });
      break;
    }
    case 'reset_password': {
      const { delivered } = await requestUserPasswordReset({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        expectedCompanyId: companyId,
      });
      if (delivered) {
        await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'password_reset', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: {}, ip });
      }
      return NextResponse.json(
        {
          success: delivered,
          message: delivered
            ? 'Link de redefinicao enviado para o email cadastrado'
            : 'Nao foi possivel enviar o link de redefinicao',
        },
        { status: delivered ? 200 : 502 },
      );
    }
    case 'soft_delete': {
      const deleted = await wq.enqueue((db) => {
        const deleteUser = db.transaction(() => db.prepare(`
          UPDATE users
          SET deleted_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(userId, companyId).changes === 1);
        return deleteUser.immediate();
      }, 'delete RH company user', { retryOnFailure: false });
      if (!deleted) {
        return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 409 });
      }
      await logAudit({ actorId: context.auth.userId, actorEmail: context.auth.userId, actorRole: 'rh', action: 'user_delete', entityType: 'user', entityId: userId, entityLabel: targetUser.name, details: { soft: true }, ip });
      break;
    }
  }

  return NextResponse.json({ success: true });
});
