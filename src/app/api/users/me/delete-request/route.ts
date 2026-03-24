import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// POST /api/users/me/delete-request - solicitar exclusão de conta (LGPD)
export const POST = withAuth(async (_req, { auth }) => {
  try {
    const writeQueue = getWriteQueue();

    await writeQueue.enqueue((db) => {
      // Create a notification to admin about the deletion request
      const adminUsers = db.prepare(
        "SELECT id FROM users WHERE role = 'admin' AND company_id = (SELECT company_id FROM users WHERE id = ?)"
      ).all(auth.userId) as { id: string }[];

      for (const admin of adminUsers) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, created_at)
          VALUES (?, ?, 'system', ?, ?, datetime('now'))
        `).run(
          nanoid(),
          admin.id,
          'Solicitação de exclusão de conta',
          `A colaboradora (ID: ${auth.userId}) solicitou a exclusão de sua conta conforme LGPD. Prazo legal: 15 dias.`
        );
      }

      // Log the request in activity_log
      db.prepare(`
        INSERT INTO activity_log (id, user_id, action, details, created_at)
        VALUES (?, ?, 'account_deletion_request', ?, datetime('now'))
      `).run(nanoid(), auth.userId, JSON.stringify({ requestedAt: new Date().toISOString() }));
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitação de exclusão registrada. Conforme a LGPD, sua conta será analisada e removida em até 15 dias úteis.',
    });
  } catch (error) {
    return handleApiError(error);
  }
});
