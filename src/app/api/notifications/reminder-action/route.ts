import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';

const reminderActionSchema = z.object({
  notificationId: z.string().min(1),
  action: z.enum(['snooze_15m', 'complete', 'reschedule']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

function extractEventTitle(message: string): string {
  const title = message.split(' - ')[0]?.trim();
  return title || message.trim();
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

export const POST = withAuth(async (req, { auth }) => {
  await initDb();
  const body = await req.json().catch(() => null);
  const parsed = reminderActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.issues }, { status: 400 });
  }

  const db = getReadDb();
  const { notificationId, action, date, time } = parsed.data;
  const notification = db.prepare(
    'SELECT id, type, title, message FROM notifications WHERE id = ? AND user_id = ?'
  ).get(notificationId, auth.userId) as { id: string; type: string; title: string; message: string } | undefined;

  if (!notification) {
    return NextResponse.json({ error: 'Notificacao nao encontrada' }, { status: 404 });
  }

  const eventTitle = extractEventTitle(notification.message);
  const event = db.prepare(`
    SELECT id, title, date, time, status
    FROM health_events
    WHERE user_id = ?
      AND deleted_at IS NULL
      AND title = ?
      AND status = 'pending'
    ORDER BY date ASC, COALESCE(time, '23:59') ASC
    LIMIT 1
  `).get(auth.userId, eventTitle) as { id: string; title: string; date: string; time: string | null; status: string } | undefined;

  if (!event) {
    return NextResponse.json({ error: 'Evento relacionado ao lembrete nao foi encontrado' }, { status: 404 });
  }

  const writeQueue = getWriteQueue();

  if (action === 'complete') {
    await writeQueue.enqueue((wdb) => {
      wdb.prepare(`
        UPDATE health_events
        SET status = 'completed', reminder_sent = 1, updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(event.id, auth.userId);

      wdb.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
        .run(notificationId, auth.userId);
    });

    return NextResponse.json({ success: true, status: 'completed', eventId: event.id });
  }

  let nextDate = date;
  let nextTime = time;

  if (action === 'snooze_15m') {
    const snoozedAt = new Date(Date.now() + 15 * 60 * 1000);
    nextDate = formatLocalDate(snoozedAt);
    nextTime = formatLocalTime(snoozedAt);
  }

  if (!nextDate || !nextTime) {
    return NextResponse.json({ error: 'Data e horario sao obrigatorios para reagendar' }, { status: 400 });
  }

  const scheduledAt = new Date(`${nextDate}T${nextTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Data ou horario invalidos' }, { status: 400 });
  }

  await writeQueue.enqueue((wdb) => {
    wdb.prepare(`
      UPDATE health_events
      SET date = ?, time = ?, reminder_sent = 0, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(nextDate, nextTime, event.id, auth.userId);

    wdb.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
      .run(notificationId, auth.userId);
  });

  return NextResponse.json({
    success: true,
    status: action === 'snooze_15m' ? 'snoozed' : 'rescheduled',
    eventId: event.id,
    date: nextDate,
    time: nextTime,
  });
});
