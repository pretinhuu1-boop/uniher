/**
 * PATCH /api/invites/approve — RH approves or rejects a pending invited user
 * Body: { userId: string, action: 'approve' | 'reject' }
 * - Requires RH role
 * - Verifies the target user belongs to the same company
 * - approve: sets approved = 1, sends notification
 * - reject: deletes the user record
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { createNotification } from '@/repositories/notification.repository';
import { z } from 'zod';

const ApproveSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
});

export const PATCH = withRole('rh')(async (req, context) => {
  await initDb();

  const body = await req.json().catch(() => ({}));
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { userId: targetUserId, action } = parsed.data;
  const rhCompanyId = context.auth.companyId;

  const db = getReadDb();
  const targetUser = db.prepare(
    'SELECT id, name, email, company_id FROM users WHERE id = ? AND approved = 0'
  ).get(targetUserId) as { id: string; name: string; email: string; company_id: string } | undefined;

  if (!targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado ou já processado' }, { status: 404 });
  }

  if (targetUser.company_id !== rhCompanyId) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const wq = getWriteQueue();

  if (action === 'approve') {
    await wq.enqueue((db) => {
      db.prepare(
        'UPDATE users SET approved = 1, updated_at = datetime(\'now\') WHERE id = ?'
      ).run(targetUserId);
    });

    await createNotification({
      userId: targetUserId,
      type: 'alert',
      title: 'Cadastro aprovado! 🎉',
      message: 'Sua gestora aprovou seu cadastro. Bem-vinda à plataforma!',
    });
  } else {
    await wq.enqueue((db) => {
      db.prepare('DELETE FROM users WHERE id = ? AND approved = 0').run(targetUserId);
    });
  }

  return NextResponse.json({ success: true });
});
