import type Database from 'better-sqlite3';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import {
  CollaboratorSelfWriteError,
  enqueueCollaboratorSelfWrite,
  hasCollaboratorSelfCapability,
} from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';

const reminderActionSchema = z.object({
  notificationId: z.string().min(1),
  action: z.enum(['snooze_15m', 'complete', 'reschedule']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

type ReminderActionInput = z.infer<typeof reminderActionSchema>;

interface ReminderNotification {
  id: string;
  type: string;
  source: string | null;
  resource_id: string | null;
}

interface ReminderEvent {
  id: string;
}

export class AgendaReminderActionError extends Error {
  constructor(message: string, readonly status: 400 | 404) {
    super(message);
    this.name = 'AgendaReminderActionError';
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Applies a reminder mutation using only persisted provenance and self ownership. */
export function applyReminderAction(
  database: Database.Database,
  userId: string,
  input: ReminderActionInput,
) {
  if (!hasCollaboratorSelfCapability(userId, database)) {
    throw new CollaboratorSelfWriteError();
  }

  const notification = database.prepare(`
    SELECT id, type, source, resource_id
    FROM notifications
    WHERE id = ? AND user_id = ?
  `).get(input.notificationId, userId) as ReminderNotification | undefined;

  if (!notification) {
    throw new AgendaReminderActionError('Notificação não encontrada', 404);
  }
  if (notification.type !== 'reminder' || notification.source !== 'agenda' || !notification.resource_id) {
    throw new AgendaReminderActionError('Lembrete sem vínculo seguro com a Agenda', 404);
  }

  const event = database.prepare(`
    SELECT id
    FROM health_events
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND status = 'pending'
  `).get(notification.resource_id, userId) as ReminderEvent | undefined;

  if (!event) {
    throw new AgendaReminderActionError('Evento relacionado ao lembrete não foi encontrado', 404);
  }

  if (input.action === 'complete') {
    const updated = database.prepare(`
      UPDATE health_events
      SET status = 'completed', reminder_sent = 1, updated_at = datetime('now')
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND status = 'pending'
    `).run(event.id, userId);
    if (updated.changes !== 1) {
      throw new AgendaReminderActionError('Evento relacionado ao lembrete não foi encontrado', 404);
    }
    database.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
      .run(notification.id, userId);
    return { success: true, status: 'completed', eventId: event.id } as const;
  }

  let nextDate = input.date;
  let nextTime = input.time;
  if (input.action === 'snooze_15m') {
    const snoozedAt = new Date(Date.now() + 15 * 60 * 1000);
    nextDate = formatLocalDate(snoozedAt);
    nextTime = formatLocalTime(snoozedAt);
  }
  if (!nextDate || !nextTime) {
    throw new AgendaReminderActionError('Data e horário são obrigatórios para reagendar', 400);
  }
  const scheduledAt = new Date(`${nextDate}T${nextTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AgendaReminderActionError('Data ou horário inválidos', 400);
  }

  const updated = database.prepare(`
    UPDATE health_events
    SET date = ?, time = ?, reminder_sent = 0, updated_at = datetime('now')
    WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND status = 'pending'
  `).run(nextDate, nextTime, event.id, userId);
  if (updated.changes !== 1) {
    throw new AgendaReminderActionError('Evento relacionado ao lembrete não foi encontrado', 404);
  }
  database.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .run(notification.id, userId);

  return {
    success: true,
    status: input.action === 'snooze_15m' ? 'snoozed' : 'rescheduled',
    eventId: event.id,
    date: nextDate,
    time: nextTime,
  } as const;
}

export const POST = withAuth(async (req, { auth }) => {
  await initDb();
  const db = getReadDb();
  if (!hasCollaboratorSelfCapability(auth.userId, db)) {
    return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reminderActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await enqueueCollaboratorSelfWrite(
      getWriteQueue(),
      auth.userId,
      (writeDb) => applyReminderAction(writeDb, auth.userId, parsed.data),
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof CollaboratorSelfWriteError || error instanceof AgendaReminderActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
});
