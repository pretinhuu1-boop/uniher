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
import { getAgendaSnoozeTime } from '@/lib/time/agenda-clock';

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

function hasValidDateTimeComponents(date: string, time: string): boolean {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return false;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const scheduledAt = new Date(Date.UTC(year, month - 1, day, hour, minute));

  return scheduledAt.getUTCFullYear() === year
    && scheduledAt.getUTCMonth() === month - 1
    && scheduledAt.getUTCDate() === day
    && scheduledAt.getUTCHours() === hour
    && scheduledAt.getUTCMinutes() === minute;
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
    WHERE id = ? AND user_id = ? AND read = 0
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
    const notificationUpdated = database.prepare(`
      UPDATE notifications SET read = 1
      WHERE id = ? AND user_id = ? AND read = 0
    `).run(notification.id, userId);
    if (notificationUpdated.changes !== 1) {
      throw new AgendaReminderActionError('Notificação não encontrada', 404);
    }
    return { success: true, status: 'completed', eventId: event.id } as const;
  }

  let nextDate = input.date;
  let nextTime = input.time;
  if (input.action === 'snooze_15m') {
    const snoozedAt = getAgendaSnoozeTime(new Date());
    nextDate = snoozedAt.date;
    nextTime = snoozedAt.time;
  }
  if (!nextDate || !nextTime) {
    throw new AgendaReminderActionError('Data e horário são obrigatórios para reagendar', 400);
  }
  if (!hasValidDateTimeComponents(nextDate, nextTime)) {
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
  const notificationUpdated = database.prepare(`
    UPDATE notifications SET read = 1
    WHERE id = ? AND user_id = ? AND read = 0
  `).run(notification.id, userId);
  if (notificationUpdated.changes !== 1) {
    throw new AgendaReminderActionError('Notificação não encontrada', 404);
  }

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
