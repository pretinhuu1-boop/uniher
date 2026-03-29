/**
 * Verifica eventos próximos e envia notificações para colaboradoras e gestores.
 * Deve ser chamado periodicamente (ex: 1x ao dia via cron ou no startup).
 */
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

interface PendingEvent {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  type: string;
  date: string;
  user_name: string;
}

/**
 * Envia lembretes para colaboradoras com eventos próximos.
 */
export async function sendUpcomingReminders(): Promise<number> {
  const db = getReadDb();
  let sent = 0;

  // Find events in next 7 days that haven't been reminded
  const events = db.prepare(`
    SELECT he.id, he.user_id, he.company_id, he.title, he.type, he.date,
           u.name as user_name
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE he.status = 'pending'
      AND he.deleted_at IS NULL
      AND he.reminder_sent = 0
      AND he.date BETWEEN date('now') AND date('now', '+7 days')
    ORDER BY he.date ASC
  `).all() as PendingEvent[];

  for (const event of events) {
    const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const typeLabel = event.type === 'exame' ? 'Exame' : event.type === 'consulta' ? 'Consulta' : 'Lembrete';

    // Notify the collaborator
    const wq = getWriteQueue();
    await wq.enqueue((db) => {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, 'reminder', ?, ?)
      `).run(
        nanoid(), event.user_id,
        `${typeLabel} em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}`,
        `${event.title} - ${event.date}`
      );

      // Mark as reminded
      db.prepare('UPDATE health_events SET reminder_sent = 1 WHERE id = ?').run(event.id);
    });
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
              `${event.user_name}: ${event.title} - ${event.date}`
            );
          });
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
