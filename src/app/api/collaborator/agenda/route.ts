/**
 * GET /api/collaborator/agenda — lista eventos da colaboradora
 * POST /api/collaborator/agenda — cria evento na agenda
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import {
  CollaboratorSelfWriteError,
  enqueueCollaboratorSelfWrite,
  hasCollaboratorSelfCapability,
} from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { agendaCreateSchema } from '@/lib/agenda/validation';
import { nanoid } from 'nanoid';

export { agendaCreateSchema };

export const GET = withAuth(async (req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;

  if (!hasCollaboratorSelfCapability(userId, db)) {
    return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month'); // YYYY-MM
  const type = url.searchParams.get('type');
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

  if (type && type !== 'all') {
    query += ` AND type = ?`;
    params.push(type);
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
  const db = getReadDb();

  if (!hasCollaboratorSelfCapability(userId, db)) {
    return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  }

  const body = await req.json();

  const parsed = agendaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
  }

  const { title, type, date, time, notes } = parsed.data;

  const writeQueue = getWriteQueue();
  const id = nanoid();

  try {
    await enqueueCollaboratorSelfWrite(writeQueue, userId, (writeDb) => {
      const user = writeDb.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as
        | { company_id: string | null }
        | undefined;
      writeDb.prepare(`
        INSERT INTO health_events (id, user_id, company_id, title, type, date, time, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, user?.company_id || null, title, type, date, time || null, notes || null);
    });
  } catch (error) {
    if (error instanceof CollaboratorSelfWriteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  // Create notification for the user
  try {
    const writeQueue2 = getWriteQueue();
    const whenLabel = time ? `${date} às ${time}` : date;
    await writeQueue2.enqueue((db) => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'system', ?, ?)
      `).run(nanoid(), userId, `${type === 'exame' ? 'Exame' : type === 'consulta' ? 'Consulta' : 'Lembrete'} agendado`, `${title} em ${whenLabel}`);
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ id, title, type, date, status: 'pending' });
});
