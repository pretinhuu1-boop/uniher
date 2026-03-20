import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue, getReadDb } from '@/lib/db';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { logAudit } from '@/lib/audit';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
  z.object({ action: z.literal('reset_password') }),
  z.object({ action: z.literal('update_role'), role: z.enum(['rh', 'lideranca', 'colaboradora']) }),
  z.object({
    action: z.literal('update'),
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']).optional(),
    company_id: z.string().nullable().optional(),
  }),
]);

export const PATCH = withRole('admin')(async (req: NextRequest, context) => {
  const params = await context.params;
  const { id: userId } = params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const writeQueue = getWriteQueue();
  const db = getReadDb();
  const targetUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as { name: string; email: string } | undefined;
  const ip = req.headers.get('x-forwarded-for') ?? undefined;

  switch (parsed.data.action) {
    case 'block':
      await writeQueue.enqueue((d) => {
        d.prepare(`UPDATE users SET blocked = 1, updated_at = datetime('now') WHERE id = ?`).run(userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: context.auth.role,
        action: 'user_block',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser?.name ?? userId,
        details: { email: targetUser?.email },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Usuário bloqueado' });

    case 'unblock':
      await writeQueue.enqueue((d) => {
        d.prepare(`UPDATE users SET blocked = 0, updated_at = datetime('now') WHERE id = ?`).run(userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: context.auth.role,
        action: 'user_unblock',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser?.name ?? userId,
        details: { email: targetUser?.email },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Usuário desbloqueado' });

    case 'reset_password': {
      // Generate a temporary password and return it (in production: send by email)
      const tempPassword = nanoid(10);
      const hash = await hashPassword(tempPassword);
      await writeQueue.enqueue((d) => {
        d.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: context.auth.role,
        action: 'password_reset',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser?.name ?? userId,
        details: { email: targetUser?.email },
        ip,
      });
      return NextResponse.json({ success: true, tempPassword, message: 'Senha resetada' });
    }

    case 'update_role': {
      const role = parsed.data.action === 'update_role' ? parsed.data.role : undefined;
      await writeQueue.enqueue((d) => {
        d.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(role, userId);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: context.auth.role,
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: targetUser?.name ?? userId,
        details: { role },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Papel atualizado' });
    }

    case 'update': {
      const { name, email, role, company_id } = parsed.data;
      const fields: string[] = [];
      const values: unknown[] = [];
      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (email !== undefined) { fields.push('email = ?'); values.push(email); }
      if (role !== undefined) { fields.push('role = ?'); values.push(role); }
      if (company_id !== undefined) { fields.push('company_id = ?'); values.push(company_id); }
      if (fields.length === 0) return NextResponse.json({ success: true });
      fields.push("updated_at = datetime('now')");
      values.push(userId);
      await writeQueue.enqueue((d) => {
        d.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      });
      await logAudit({
        actorId: context.auth.userId,
        actorEmail: context.auth.userId,
        actorRole: context.auth.role,
        action: 'user_edit',
        entityType: 'user',
        entityId: userId,
        entityLabel: name ?? targetUser?.name ?? userId,
        details: { ...(email ? { email } : {}), ...(role ? { role } : {}) },
        ip,
      });
      return NextResponse.json({ success: true, message: 'Usuário atualizado' });
    }
  }
});
