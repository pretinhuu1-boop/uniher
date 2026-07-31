import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getWriteQueue, getReadDb } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { requestUserPasswordReset } from '@/lib/auth/request-user-password-reset';
import { runAsActiveMasterAdminActor } from '@/lib/security/active-rh-actor';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
  z.object({ action: z.literal('reset_password') }),
  z.object({
    action: z.literal('update_role'),
    role: z.enum(['rh', 'lideranca', 'colaboradora']),
  }),
  z.object({
    action: z.literal('update'),
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']).optional(),
    company_id: z.string().nullable().optional(),
  }),
]);

interface TargetUser {
  id: string;
  name: string;
  email: string;
}

function expiredAuthorizationResponse() {
  return NextResponse.json(
    { error: 'Autorizacao administrativa expirou' },
    { status: 409 },
  );
}

function changedTargetResponse() {
  return NextResponse.json(
    { error: 'Usuario nao encontrado ou alterado' },
    { status: 409 },
  );
}

export const PATCH = withMasterAdmin(async (req: NextRequest, context) => {
  const { id: userId } = await context.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const writeQueue = getWriteQueue();
  const actorId = context.auth.userId;
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  switch (parsed.data.action) {
    case 'block':
    case 'unblock': {
      const blocked = parsed.data.action === 'block' ? 1 : 0;
      const outcome = await writeQueue.enqueue((db) => (
        runAsActiveMasterAdminActor(db, actorId, () => {
          const target = db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE id = ? AND deleted_at IS NULL
          `).get(userId) as TargetUser | undefined;
          if (!target) return null;

          const updated = db.prepare(`
            UPDATE users
            SET blocked = ?, updated_at = datetime('now')
            WHERE id = ? AND deleted_at IS NULL
          `).run(blocked, userId);
          return updated.changes === 1 ? target : null;
        })
      ), `${parsed.data.action} user as Master Admin`, { retryOnFailure: false });

      if (!outcome.authorized) return expiredAuthorizationResponse();
      if (!outcome.value) return changedTargetResponse();

      await logAudit({
        actorId,
        actorEmail: actorId,
        actorRole: context.auth.role,
        action: parsed.data.action === 'block' ? 'user_block' : 'user_unblock',
        entityType: 'user',
        entityId: userId,
        entityLabel: outcome.value.name,
        details: { email: outcome.value.email },
        ip,
      });
      return NextResponse.json({
        success: true,
        message: parsed.data.action === 'block'
          ? 'Usuario bloqueado'
          : 'Usuario desbloqueado',
      });
    }

    case 'reset_password': {
      const db = getReadDb();
      const targetUser = db.prepare(`
        SELECT id, name, email
        FROM users
        WHERE id = ? AND deleted_at IS NULL
      `).get(userId) as TargetUser | undefined;
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Usuario nao encontrado' },
          { status: 404 },
        );
      }

      const { delivered } = await requestUserPasswordReset({
        ...targetUser,
        expectedActorId: actorId,
        expectedActorRole: 'admin',
      });
      if (delivered) {
        await logAudit({
          actorId,
          actorEmail: actorId,
          actorRole: context.auth.role,
          action: 'password_reset',
          entityType: 'user',
          entityId: userId,
          entityLabel: targetUser.name,
          details: { email: targetUser.email },
          ip,
        });
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

    case 'update_role': {
      const role = parsed.data.role;
      const outcome = await writeQueue.enqueue((db) => (
        runAsActiveMasterAdminActor(db, actorId, () => {
          const target = db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE id = ? AND deleted_at IS NULL
          `).get(userId) as TargetUser | undefined;
          if (!target) return null;

          const updated = db.prepare(`
            UPDATE users
            SET role = ?, is_master_admin = 0, updated_at = datetime('now')
            WHERE id = ? AND deleted_at IS NULL
          `).run(role, userId);
          return updated.changes === 1 ? target : null;
        })
      ), 'update user role as Master Admin', { retryOnFailure: false });

      if (!outcome.authorized) return expiredAuthorizationResponse();
      if (!outcome.value) return changedTargetResponse();

      await logAudit({
        actorId,
        actorEmail: actorId,
        actorRole: context.auth.role,
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: outcome.value.name,
        details: { role },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Papel atualizado' });
    }

    case 'update': {
      const { name, email, role, company_id } = parsed.data;
      const fields: string[] = [];
      const values: unknown[] = [];
      if (name !== undefined) {
        fields.push('name = ?');
        values.push(name);
      }
      if (email !== undefined) {
        fields.push('email = ?');
        values.push(email);
      }
      if (role !== undefined) {
        fields.push('role = ?');
        values.push(role);
        fields.push('is_master_admin = ?');
        values.push(role === 'admin' ? 1 : 0);
      }
      if (company_id !== undefined) {
        fields.push('company_id = ?');
        values.push(company_id);
      }
      if (fields.length === 0) {
        return NextResponse.json({ success: true });
      }
      fields.push("updated_at = datetime('now')");

      const outcome = await writeQueue.enqueue((db) => (
        runAsActiveMasterAdminActor(db, actorId, () => {
          const target = db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE id = ? AND deleted_at IS NULL
          `).get(userId) as TargetUser | undefined;
          if (!target) return { status: 'invalid_target' as const };

          if (company_id) {
            const company = db.prepare(`
              SELECT id
              FROM companies
              WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
            `).get(company_id);
            if (!company) return { status: 'invalid_company' as const };
          }

          const updated = db.prepare(`
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = ? AND deleted_at IS NULL
          `).run(...values, userId);
          return updated.changes === 1
            ? { status: 'updated' as const, target }
            : { status: 'invalid_target' as const };
        })
      ), 'update user as Master Admin', { retryOnFailure: false });

      if (!outcome.authorized) return expiredAuthorizationResponse();
      if (outcome.value.status === 'invalid_company') {
        return NextResponse.json(
          { error: 'Empresa nao encontrada' },
          { status: 409 },
        );
      }
      if (outcome.value.status !== 'updated') return changedTargetResponse();

      await logAudit({
        actorId,
        actorEmail: actorId,
        actorRole: context.auth.role,
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: name ?? outcome.value.target.name,
        details: {
          ...(email ? { email } : {}),
          ...(role ? { role } : {}),
        },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Usuario atualizado' });
    }
  }
});

export const DELETE = withMasterAdmin(async (req: NextRequest, context) => {
  const { id: userId } = await context.params;
  const actorId = context.auth.userId;
  const writeQueue = getWriteQueue();
  const outcome = await writeQueue.enqueue((db) => (
    runAsActiveMasterAdminActor(db, actorId, () => {
      const target = db.prepare(`
        SELECT id, name, email
        FROM users
        WHERE id = ? AND deleted_at IS NULL
      `).get(userId) as TargetUser | undefined;
      if (!target) return null;

      const deleted = db.prepare(`
        UPDATE users
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL
      `).run(userId);
      return deleted.changes === 1 ? target : null;
    })
  ), 'delete user as Master Admin', { retryOnFailure: false });

  if (!outcome.authorized) return expiredAuthorizationResponse();
  if (!outcome.value) return changedTargetResponse();

  await logAudit({
    actorId,
    actorEmail: actorId,
    actorRole: context.auth.role,
    action: 'user_delete',
    entityType: 'user',
    entityId: userId,
    entityLabel: outcome.value.name,
    details: { email: outcome.value.email },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });
  return NextResponse.json({ success: true, message: 'Usuario removido' });
});
