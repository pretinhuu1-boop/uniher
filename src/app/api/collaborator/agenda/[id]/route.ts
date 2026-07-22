/**
 * PATCH /api/collaborator/agenda/[id] — atualiza evento
 * DELETE /api/collaborator/agenda/[id] — cancela evento (soft delete)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import {
  CollaboratorSelfWriteError,
  enqueueCollaboratorSelfWrite,
  hasCollaboratorSelfCapability,
} from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}, 'Data inválida');

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const agendaPatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  date: calendarDateSchema.optional(),
  time: timeSchema.optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'missed']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Nenhum campo para atualizar');

class AgendaEventNotFoundError extends Error {
  readonly status = 404;

  constructor() {
    super('Evento não encontrado');
    this.name = 'AgendaEventNotFoundError';
  }
}

function agendaWriteErrorResponse(error: unknown) {
  if (error instanceof CollaboratorSelfWriteError || error instanceof AgendaEventNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export const PATCH = withAuth(async (req: NextRequest, context: AuthContext) => {
  await initDb();
  const userId = context.auth.userId;
  const db = getReadDb();
  if (!hasCollaboratorSelfCapability(userId, db)) {
    return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  }
  const params = await context.params;
  const id = params.id;
  const body = await req.json().catch(() => null);
  const parsed = agendaPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
  }

  const event = db.prepare('SELECT id FROM health_events WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .get(id, userId) as { id: string } | undefined;
  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  const allowed = ['title', 'date', 'time', 'notes', 'status'] as const;
  const updates: string[] = [];
  const values: string[] = [];

  for (const key of allowed) {
    const value = parsed.data[key];
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  const writeQueue = getWriteQueue();
  try {
    await enqueueCollaboratorSelfWrite(writeQueue, userId, (writeDb) => {
      const updated = writeDb.prepare(`
        UPDATE health_events
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      `).run(...values);
      if (updated.changes !== 1) throw new AgendaEventNotFoundError();
    });
  } catch (error) {
    return agendaWriteErrorResponse(error);
  }

  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (_req: NextRequest, context: AuthContext) => {
  await initDb();
  const userId = context.auth.userId;
  const db = getReadDb();
  if (!hasCollaboratorSelfCapability(userId, db)) {
    return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  }
  const params = await context.params;
  const id = params.id;

  const event = db.prepare('SELECT id FROM health_events WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .get(id, userId) as { id: string } | undefined;
  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  const writeQueue = getWriteQueue();
  try {
    await enqueueCollaboratorSelfWrite(writeQueue, userId, (writeDb) => {
      const deleted = writeDb.prepare(`
        UPDATE health_events
        SET deleted_at = datetime('now'), status = 'cancelled'
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      `).run(id, userId);
      if (deleted.changes !== 1) throw new AgendaEventNotFoundError();
    });
  } catch (error) {
    return agendaWriteErrorResponse(error);
  }

  return NextResponse.json({ success: true });
});
