import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { logAudit } from '@/lib/audit';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const ApproveSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
});

interface PendingInviteUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const PATCH = withRole('rh')(async (req, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  const { userId: targetUserId, action } = parsed.data;
  const rhCompanyId = context.auth.companyId;
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, rhCompanyId, () => {
      const target = db.prepare(`
        SELECT id, name, email, role
        FROM users
        WHERE id = ?
          AND company_id = ?
          AND approved = 0
          AND blocked = 0
          AND deleted_at IS NULL
      `).get(targetUserId, rhCompanyId) as PendingInviteUser | undefined;
      if (!target) return { status: 'not_found' as const };
      if (!['lideranca', 'colaboradora'].includes(target.role)) {
        return { status: 'protected_role' as const };
      }

      if (action === 'approve') {
        const approved = db.prepare(`
          UPDATE users
          SET approved = 1, updated_at = datetime('now')
          WHERE id = ?
            AND company_id = ?
            AND approved = 0
            AND blocked = 0
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(targetUserId, rhCompanyId);
        if (approved.changes !== 1) {
          return { status: 'not_found' as const };
        }
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message)
          VALUES (?, ?, 'alert', ?, ?)
        `).run(
          nanoid(),
          targetUserId,
          'Cadastro aprovado!',
          'Sua gestora aprovou seu cadastro. Bem-vinda a plataforma!',
        );
      } else {
        const rejected = db.prepare(`
          DELETE FROM users
          WHERE id = ?
            AND company_id = ?
            AND approved = 0
            AND blocked = 0
            AND role IN ('lideranca', 'colaboradora')
            AND deleted_at IS NULL
        `).run(targetUserId, rhCompanyId);
        if (rejected.changes !== 1) {
          return { status: 'not_found' as const };
        }
      }

      return { status: 'processed' as const, target };
    })
  ), `${action} invited user as RH`, { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json(
      { error: 'Autorizacao do RH expirou' },
      { status: 409 },
    );
  }
  if (outcome.value.status === 'protected_role') {
    return NextResponse.json(
      { error: 'RH nao pode processar este papel' },
      { status: 403 },
    );
  }
  if (outcome.value.status === 'not_found') {
    return NextResponse.json(
      { error: 'Usuario nao encontrado ou ja processado' },
      { status: 404 },
    );
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: action === 'approve' ? 'invite_approved' : 'invite_rejected',
    entityType: 'user',
    entityId: targetUserId,
    entityLabel: outcome.value.target.email,
    details: { action, targetName: outcome.value.target.name },
    ip: req.headers.get('x-forwarded-for')
      || req.headers.get('x-real-ip')
      || undefined,
  });

  return NextResponse.json({ success: true });
});
