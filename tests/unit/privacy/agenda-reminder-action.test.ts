import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
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
