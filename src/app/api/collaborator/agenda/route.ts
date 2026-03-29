/**
 * GET /api/collaborator/agenda — lista eventos da colaboradora
 * POST /api/collaborator/agenda — cria evento na agenda
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['exame', 'consulta', 'lembrete']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const GET = withAuth(async (req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;

  const url = new URL(req.url);
  const month = url.searchParams.get('month'); // YYYY-MM
  const status = url.searchParams.get('status');

  let query = `
    SELECT id, title, type, date, time, notes, status, created_at
    FROM health_events
    WHERE user_id = ? AND deleted_at IS NULL
  `;
  const params: any[] = [userId];

  if (month) {
    query += ` AND date LIKE ?`;
    params.push(month + '%');
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY date ASC, time ASC`;

  const events = db.prepare(query).all(...params);

  return NextResponse.json({ events });
});

export const POST = withAuth(async (req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;
  const body = await req.json();

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
  }

  const { title, type, date, time, notes } = parsed.data;

  // Get user's company_id
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;

  const writeQueue = getWriteQueue();
  const id = nanoid();

  await writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO health_events (id, user_id, company_id, title, type, date, time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, user?.company_id || null, title, type, date, time || null, notes || null);
  });

  // Create notification for the user
  try {
    const writeQueue2 = getWriteQueue();
    await writeQueue2.enqueue((db) => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'system', ?, ?)
      `).run(nanoid(), userId, `${type === 'exame' ? 'Exame' : type === 'consulta' ? 'Consulta' : 'Lembrete'} agendado`, `${title} em ${date}`);
    });
  } catch { /* non-critical */ }

  // Notify managers (RH/lideranca) of the same company
  if (user?.company_id && type !== 'lembrete') {
    try {
      const managers = db.prepare(`
        SELECT id FROM users
        WHERE company_id = ? AND role IN ('rh', 'lideranca') AND deleted_at IS NULL AND blocked = 0 AND id != ?
      `).all(user.company_id, userId) as { id: string }[];

      const userName = (db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any)?.name || 'Colaboradora';

      const wq = getWriteQueue();
      for (const mgr of managers) {
        await wq.enqueue((db) => {
          db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, message)
            VALUES (?, ?, 'system', ?, ?)
          `).run(nanoid(), mgr.id, `${type === 'exame' ? 'Exame' : 'Consulta'} agendada`, `${userName} agendou: ${title} em ${date}`);
        });
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ id, title, type, date, status: 'pending' });
});
