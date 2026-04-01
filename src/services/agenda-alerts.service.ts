/**
 * Verifica eventos próximos e envia notificações para colaboradoras e gestores.
 * Deve ser chamado periodicamente (ex: 1x ao dia via cron ou no startup).
 */
import { getReadDb, getWriteQueue } from '@/lib/db';
import { isPushEnabled, sendPushNotification } from '@/lib/push';
import { nanoid } from 'nanoid';

interface PendingEvent {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
  user_name: string;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendReminderPush(userId: string, title: string, body: string, url = '/agenda') {
  if (!isPushEnabled()) return;

  const db = getReadDb();
  const prefs = db.prepare(`
    SELECT browser_enabled
    FROM notification_preferences
    WHERE user_id = ?
  `).get(userId) as { browser_enabled?: number } | undefined;

  if (!prefs || prefs.browser_enabled !== 1) return;

  const subscriptions = db.prepare(`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ?
  `).all(userId) as PushSubscriptionRow[];

  if (!subscriptions.length) return;

  await Promise.all(
    subscriptions.map((subscription) =>
      sendPushNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        {
          title,
          body,
          url,
          icon: '/logo-uniher.png',
        }
      ).catch(() => false)
    )
  );
}

/**
 * Envia lembretes para colaboradoras com eventos próximos.
 */
export async function sendUpcomingReminders(): Promise<number> {
  const db = getReadDb();
  let sent = 0;

  // Find events due in the next 30 minutes that haven't been reminded yet.
  // If no specific time was set, assume 09:00 on the selected date.
  const events = db.prepare(`
    SELECT he.id, he.user_id, he.company_id, he.title, he.type, he.date, he.time,
           u.name as user_name
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE he.status = 'pending'
      AND he.deleted_at IS NULL
      AND he.reminder_sent = 0
      AND datetime(
        he.date || ' ' || COALESCE(NULLIF(he.time, ''), '09:00')
      ) BETWEEN datetime('now') AND datetime('now', '+30 minutes')
    ORDER BY he.date ASC, he.time ASC
  `).all() as PendingEvent[];

  for (const event of events) {
    const scheduledAt = new Date(`${event.date}T${event.time || '09:00'}:00`);
    const hoursUntil = Math.max(0, Math.round((scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)));
    const daysUntil = Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const typeLabel = event.type === 'exame' ? 'Exame' : event.type === 'consulta' ? 'Consulta' : 'Lembrete';
    const whenLabel = event.time ? `${event.date} às ${event.time}` : `${event.date} pela manhã`;

    // Notify the collaborator
    const wq = getWriteQueue();
    await wq.enqueue((db) => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'reminder', ?, ?)
      `).run(
        nanoid(), event.user_id,
        `${typeLabel} de hoje`,
        `${event.title} - ${whenLabel}`
      );

      // Mark as reminded
      db.prepare('UPDATE health_events SET reminder_sent = 1 WHERE id = ?').run(event.id);
    });
    await sendReminderPush(
      event.user_id,
      `${typeLabel} chegando`,
      `${event.title} está marcado para ${whenLabel}. Toque para abrir sua agenda.`
    );
    sent++;

    // Notify managers based on their preferences
    if (event.company_id && event.type !== 'lembrete') {
      const managers = db.prepare(`
        SELECT u.id, ap.days_before
        FROM users u
        LEFT JOIN alert_preferences ap ON ap.user_id = u.id AND (ap.alert_type = ? OR ap.alert_type = 'all')
        WHERE u.company_id = ? AND u.role IN ('rh', 'lideranca')
          AND u.deleted_at IS NULL AND u.blocked = 0
          AND u.id != ?
      `).all(event.type, event.company_id, event.user_id) as { id: string; days_before: number | null }[];

      for (const mgr of managers) {
        const alertDays = mgr.days_before ?? 3;
        if (daysUntil <= alertDays) {
          const wq2 = getWriteQueue();
          await wq2.enqueue((db) => {
            db.prepare(`
              INSERT INTO notifications (id, user_id, type, title, message)
              VALUES (?, ?, 'alert', ?, ?)
            `).run(
              nanoid(), mgr.id,
              `${typeLabel} de colaboradora em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`,
              `${event.user_name}: ${event.title} - ${whenLabel}`
            );
          });
          await sendReminderPush(
            mgr.id,
            `${typeLabel} da equipe próximo`,
            `${event.user_name} tem ${event.title} marcado para ${whenLabel}.`
          );
          sent++;
        }
      }
    }
  }

  // Mark overdue events
  const wqOverdue = getWriteQueue();
  await wqOverdue.enqueue((db) => {
    db.prepare(`
      UPDATE health_events SET status = 'missed'
      WHERE status = 'pending' AND date < date('now') AND deleted_at IS NULL
    `).run();
  });

  return sent;
}

/**
 * Retorna estatísticas de adesão para o gestor.
 */
export function getAgendaStats(companyId: string) {
  const db = getReadDb();

  return db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
      COUNT(DISTINCT user_id) as users_with_events
    FROM health_events
    WHERE company_id = ? AND deleted_at IS NULL
  `).get(companyId);
}
