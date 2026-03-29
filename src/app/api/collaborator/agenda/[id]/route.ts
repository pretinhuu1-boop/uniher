/**
 * PATCH /api/collaborator/agenda/[id] — atualiza evento
 * DELETE /api/collaborator/agenda/[id] — cancela evento (soft delete)
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const PATCH = withAuth(async (req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;
  const params = await context.params;
  const id = params.id;
  const body = await req.json();

  const db = getReadDb();
  const event = db.prepare('SELECT * FROM health_events WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId) as any;
  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  const allowed = ['title', 'date', 'time', 'notes', 'status'];
  const updates: string[] = [];
  const values: any[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare(`UPDATE health_events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (_req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;
  const params = await context.params;
  const id = params.id;

  const db = getReadDb();
  const event = db.prepare('SELECT * FROM health_events WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(id, userId) as any;
  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare("UPDATE health_events SET deleted_at = datetime('now'), status = 'cancelled' WHERE id = ?").run(id);
  });

  return NextResponse.json({ success: true });
});
