import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as reminderAction from '@/app/api/notifications/reminder-action/route';

const databases: Database.Database[] = [];

function createReminderDatabase() {
  const db = new Database(':memory:');
  databases.push(db);
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      also_collaborator INTEGER DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE health_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      status TEXT DEFAULT 'pending',
      reminder_sent INTEGER DEFAULT 0,
      deleted_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      source TEXT,
      resource_id TEXT
    );
    INSERT INTO users (id, role) VALUES ('collaborator-ana', 'colaboradora'), ('collaborator-bia', 'colaboradora');
  `);
  return db;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('Agenda reminder action provenance', () => {
  it('acts on resource_id instead of the first event sharing the same title', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date, status) VALUES
        ('event-first', 'collaborator-ana', 'Mamografia', '2026-07-16', 'pending'),
        ('event-second', 'collaborator-ana', 'Mamografia', '2026-07-17', 'pending');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('reminder-second', 'collaborator-ana', 'reminder', 'Exame de hoje', 'Mamografia - amanhã', 'agenda', 'event-second');
    `);
    const applyReminderAction = (reminderAction as typeof reminderAction & {
      applyReminderAction?: (
        database: Database.Database,
        userId: string,
        input: { notificationId: string; action: 'complete' },
      ) => { eventId: string; status: string };
    }).applyReminderAction;
    expect(applyReminderAction).toBeTypeOf('function');

    expect(applyReminderAction?.(db, 'collaborator-ana', {
      notificationId: 'reminder-second',
      action: 'complete',
    })).toMatchObject({ eventId: 'event-second', status: 'completed' });
    expect(db.prepare('SELECT id, status FROM health_events ORDER BY id').all()).toEqual([
      { id: 'event-first', status: 'pending' },
      { id: 'event-second', status: 'completed' },
    ]);
  });

  it('fails closed for legacy reminders without Agenda provenance', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date) VALUES
        ('event-legacy', 'collaborator-ana', 'Mamografia', '2026-07-16');
      INSERT INTO notifications (id, user_id, type, title, message)
      VALUES ('legacy-reminder', 'collaborator-ana', 'reminder', 'Exame de hoje', 'Mamografia - hoje');
    `);
    const applyReminderAction = (reminderAction as typeof reminderAction & {
      applyReminderAction?: (database: Database.Database, userId: string, input: { notificationId: string; action: 'complete' }) => unknown;
    }).applyReminderAction;
    expect(applyReminderAction).toBeTypeOf('function');

    expect(() => applyReminderAction?.(db, 'collaborator-ana', {
      notificationId: 'legacy-reminder',
      action: 'complete',
    })).toThrow('Lembrete sem vínculo seguro com a Agenda');
  });

  it('does not cross ownership even with valid-looking provenance', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date) VALUES
        ('event-bia', 'collaborator-bia', 'Consulta', '2026-07-16');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('forged-reminder', 'collaborator-ana', 'reminder', 'Consulta', 'Consulta', 'agenda', 'event-bia');
    `);
    const applyReminderAction = (reminderAction as typeof reminderAction & {
      applyReminderAction?: (database: Database.Database, userId: string, input: { notificationId: string; action: 'complete' }) => unknown;
    }).applyReminderAction;
    expect(applyReminderAction).toBeTypeOf('function');

    expect(() => applyReminderAction?.(db, 'collaborator-ana', {
      notificationId: 'forged-reminder',
      action: 'complete',
    })).toThrow('Evento relacionado ao lembrete não foi encontrado');
    expect(db.prepare("SELECT status FROM health_events WHERE id = 'event-bia'").get()).toEqual({ status: 'pending' });
  });

  it('rejects an impossible reschedule date instead of normalizing it', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date) VALUES
        ('event-invalid-date', 'collaborator-ana', 'Consulta', '2026-07-16');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('reminder-invalid-date', 'collaborator-ana', 'reminder', 'Consulta', 'Consulta', 'agenda', 'event-invalid-date');
    `);

    expect(() => reminderAction.applyReminderAction(db, 'collaborator-ana', {
      notificationId: 'reminder-invalid-date',
      action: 'reschedule',
      date: '2026-02-31',
      time: '09:30',
    })).toThrow('Data ou horário inválidos');
    expect(db.prepare("SELECT date FROM health_events WHERE id = 'event-invalid-date'").get())
      .toEqual({ date: '2026-07-16' });
  });

  it('accepts a valid leap-day reschedule date', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date) VALUES
        ('event-leap-date', 'collaborator-ana', 'Consulta', '2026-07-16');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('reminder-leap-date', 'collaborator-ana', 'reminder', 'Consulta', 'Consulta', 'agenda', 'event-leap-date');
    `);

    expect(reminderAction.applyReminderAction(db, 'collaborator-ana', {
      notificationId: 'reminder-leap-date',
      action: 'reschedule',
      date: '2028-02-29',
      time: '09:30',
    })).toMatchObject({ status: 'rescheduled', date: '2028-02-29', time: '09:30' });
  });

  it('snoozes at the Sao Paulo civil time regardless of the process timezone', () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = 'UTC';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-16T12:00:00.000Z'));
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date, time) VALUES
        ('event-snooze-clock', 'collaborator-ana', 'Consulta', '2026-07-16', '09:00');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('reminder-snooze-clock', 'collaborator-ana', 'reminder', 'Consulta', 'Consulta', 'agenda', 'event-snooze-clock');
    `);

    try {
      expect(reminderAction.applyReminderAction(db, 'collaborator-ana', {
        notificationId: 'reminder-snooze-clock',
        action: 'snooze_15m',
      })).toMatchObject({ status: 'snoozed', date: '2026-07-16', time: '09:15' });
    } finally {
      vi.useRealTimers();
      process.env.TZ = previousTimeZone;
    }
  });

  it('treats a reminder notification as single-use', () => {
    const db = createReminderDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, date, time) VALUES
        ('event-single-use', 'collaborator-ana', 'Consulta', '2026-07-16', '09:00');
      INSERT INTO notifications (id, user_id, type, title, message, source, resource_id)
      VALUES ('reminder-single-use', 'collaborator-ana', 'reminder', 'Consulta', 'Consulta', 'agenda', 'event-single-use');
    `);

    expect(reminderAction.applyReminderAction(db, 'collaborator-ana', {
      notificationId: 'reminder-single-use',
      action: 'reschedule',
      date: '2026-07-17',
      time: '10:00',
    })).toMatchObject({ status: 'rescheduled' });

    expect(() => reminderAction.applyReminderAction(db, 'collaborator-ana', {
      notificationId: 'reminder-single-use',
      action: 'reschedule',
      date: '2026-07-18',
      time: '11:00',
    })).toThrow(expect.objectContaining({ status: 404 }));
    expect(db.prepare("SELECT date, time FROM health_events WHERE id = 'event-single-use'").get())
      .toEqual({ date: '2026-07-17', time: '10:00' });
  });

  it('routes every Agenda mutation through the queued collaborator-self guard', () => {
    const routes = [
      'src/app/api/collaborator/agenda/route.ts',
      'src/app/api/collaborator/agenda/[id]/route.ts',
      'src/app/api/notifications/reminder-action/route.ts',
    ].map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8'));

    expect(routes[0].match(/enqueueCollaboratorSelfWrite/g)).toHaveLength(2);
    expect(routes[1].match(/enqueueCollaboratorSelfWrite/g)).toHaveLength(3);
    expect(routes[2]).toContain('enqueueCollaboratorSelfWrite');
  });
});
