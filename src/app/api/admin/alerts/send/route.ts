import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const SendSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  company_id: z.string().optional(), // admin can target specific company; empty = all companies
});

export const POST = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });

  const { title, message, company_id } = parsed.data;
  const db = getReadDb();

  // Get target users
  const users = company_id
    ? (db.prepare(`SELECT id FROM users WHERE company_id = ? AND blocked = 0 AND role != 'admin'`).all(company_id) as { id: string }[])
    : (db.prepare(`SELECT id FROM users WHERE blocked = 0 AND role != 'admin'`).all() as { id: string }[]);

  if (users.length === 0) return NextResponse.json({ success: true, recipients: 0 });

  const alertId = nanoid();
  const wq = getWriteQueue();

  await wq.enqueue((db) => {
    const notifStmt = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES (?, ?, 'alert', ?, ?)
    `);
    for (const u of users) {
      notifStmt.run(nanoid(), u.id, title, message);
    }

    // Record alert in admin_alerts (best-effort)
    try {
      db.prepare(`
        INSERT INTO admin_alerts (id, company_id, sent_by, title, message, recipients_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(alertId, company_id ?? 'all', context.auth.userId, title, message, users.length);
    } catch { /* table may not exist yet */ }
  });

  return NextResponse.json({ success: true, recipients: users.length });
});

export const GET = withRole('admin')(async (_req: NextRequest) => {
  await initDb();
  const db = getReadDb();
  try {
    const alerts = db.prepare(`
      SELECT a.*, u.name as sent_by_name
      FROM admin_alerts a
      LEFT JOIN users u ON u.id = a.sent_by
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all() as any[];
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
});
