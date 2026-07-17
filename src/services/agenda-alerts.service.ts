import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { isPushEnabled, sendPushNotification } from '@/lib/push';
import { getAgendaReminderWindow } from '@/lib/time/agenda-clock';

interface PendingEvent {
  id: string;
  user_id: string;
  title: string;
  type: string;
  date: string;
  time: string | null;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface AgendaReminderQueue {
  enqueue<T>(operation: (db: Database.Database) => T): Promise<T>;
}

interface AgendaPushDependencies {
  enabled(): boolean;
  send: typeof sendPushNotification;
}

export interface AgendaReminderDependencies {
  database: Database.Database;
  queue: AgendaReminderQueue;
  push: AgendaPushDependencies;
  now(): Date;
}

export interface AgendaReminderResult {
  personalRemindersSent: number;
}

function getTableColumns(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map(({ name }) => name));
}

async function sendReminderPush(
  db: Database.Database,
  push: AgendaPushDependencies,
  userId: string,
  title: string,
  body: string,
) {
  if (!push.enabled()) return;

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

  await Promise.all(
    subscriptions.map((subscription) =>
      push.send(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        { title, body, url: '/agenda', icon: '/logo-uniher.png' },
      ).catch(() => false),
    ),
  );
}

/** Sends only self-owned Agenda reminders. Manager Agenda alerts are intentionally unsupported. */
export async function sendUpcomingReminders(
  overrides: Partial<AgendaReminderDependencies> = {},
): Promise<AgendaReminderResult> {
  const database = overrides.database ?? getReadDb();
  const queue = overrides.queue ?? getWriteQueue();
  const push = overrides.push ?? { enabled: isPushEnabled, send: sendPushNotification };
  const now = overrides.now ?? (() => new Date());
  let personalRemindersSent = 0;

  const userColumns = getTableColumns(database, 'users');
  const capabilityCondition = userColumns.has('also_collaborator')
    ? "(u.role = 'colaboradora' OR u.also_collaborator = 1)"
    : "u.role = 'colaboradora'";
  const activeConditions = [
    capabilityCondition,
    userColumns.has('deleted_at') ? 'u.deleted_at IS NULL' : null,
    userColumns.has('blocked') ? 'COALESCE(u.blocked, 0) = 0' : null,
    userColumns.has('approved') ? 'COALESCE(u.approved, 0) = 1' : null,
  ].filter((condition): condition is string => condition !== null);

  const initialWindow = getAgendaReminderWindow(now());
  const events = database.prepare(`
    SELECT he.id, he.user_id, he.title, he.type, he.date, he.time
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE he.status = 'pending'
      AND he.deleted_at IS NULL
      AND he.reminder_sent = 0
      AND ${activeConditions.join('\n      AND ')}
      AND datetime(he.date || ' ' || COALESCE(NULLIF(he.time, ''), '09:00'))
          BETWEEN datetime(?) AND datetime(?)
    ORDER BY he.date ASC, he.time ASC
  `).all(initialWindow.windowStart, initialWindow.windowEnd) as PendingEvent[];

  for (const event of events) {
    const typeLabel = event.type === 'exame' ? 'Exame' : event.type === 'consulta' ? 'Consulta' : 'Lembrete';
    const whenLabel = event.time ? `${event.date} às ${event.time}` : `${event.date} pela manhã`;

    const persisted = await queue.enqueue((db) => {
      const persistReminder = db.transaction(() => {
        if (!hasCollaboratorSelfCapability(event.user_id, db)) {
          return false;
        }
        const transactionWindow = getAgendaReminderWindow(now());
        const updated = db.prepare(`
          UPDATE health_events
          SET reminder_sent = 1
          WHERE id = ?
            AND user_id = ?
            AND status = 'pending'
            AND deleted_at IS NULL
            AND reminder_sent = 0
            AND date = ?
            AND COALESCE(time, '') = COALESCE(?, '')
            AND datetime(date || ' ' || COALESCE(NULLIF(time, ''), '09:00'))
                BETWEEN datetime(?) AND datetime(?)
        `).run(
          event.id,
          event.user_id,
          event.date,
          event.time,
          transactionWindow.windowStart,
          transactionWindow.windowEnd,
        );
        if (updated.changes !== 1) {
          return false;
        }
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
          VALUES (?, ?, 'reminder', ?, ?, 'agenda', ?)
        `).run(
          nanoid(),
          event.user_id,
          `${typeLabel} de hoje`,
          `${event.title} - ${whenLabel}`,
          event.id,
        );
        return true;
      });
      return persistReminder.immediate();
    });

    if (!persisted) continue;

    await sendReminderPush(
      database,
      push,
      event.user_id,
      `${typeLabel} chegando`,
      `${event.title} está marcado para ${whenLabel}. Toque para abrir sua agenda.`,
    );
    personalRemindersSent += 1;
  }

  await queue.enqueue((db) => {
    const { today } = getAgendaReminderWindow(now());
    db.prepare(`
      UPDATE health_events SET status = 'missed'
      WHERE status = 'pending' AND date < ? AND deleted_at IS NULL
    `).run(today);
  });

  return { personalRemindersSent };
}
