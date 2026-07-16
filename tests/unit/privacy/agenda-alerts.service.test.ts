import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendUpcomingReminders } from '@/services/agenda-alerts.service';

const databases: Database.Database[] = [];
const FIXED_NOW = new Date('2026-07-16T12:00:00.000Z');
const fixedNow = () => FIXED_NOW;

function createAgendaDatabase() {
  const queries: string[] = [];
  const db = new Database(':memory:', { verbose: (sql) => queries.push(String(sql)) });
  databases.push(db);
  db.exec(`
    CREATE TABLE health_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      status TEXT DEFAULT 'pending',
      reminder_sent INTEGER DEFAULT 0,
      deleted_at TEXT
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
    CREATE TABLE notification_preferences (
      user_id TEXT PRIMARY KEY,
      browser_enabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      role TEXT NOT NULL,
      also_collaborator INTEGER DEFAULT 0,
      deleted_at TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1
    );
    CREATE TABLE alert_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      days_before INTEGER DEFAULT 3,
      enabled INTEGER DEFAULT 1
    );
  `);
  return { db, queries };
}

function inlineQueue(db: Database.Database) {
  return {
    enqueue: async <T>(operation: (writeDb: Database.Database) => T) => operation(db),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  while (databases.length > 0) databases.pop()?.close();
});

describe('sendUpcomingReminders privacy containment', () => {
  it('uses the Sao Paulo civil window instead of firing three hours early', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO users (id, role) VALUES ('collaborator-clock', 'colaboradora');
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('event-clock', 'collaborator-clock', 'Consulta pessoal', 'consulta', '2026-07-16', '09:15');
    `);
    let now = new Date('2026-07-16T09:00:00.000Z');
    const dependencies = {
      database: db,
      queue: inlineQueue(db),
      push: { enabled: () => false, send: vi.fn() },
      now: () => now,
    } as Parameters<typeof sendUpcomingReminders>[0] & { now: () => Date };

    await expect(sendUpcomingReminders(dependencies))
      .resolves.toEqual({ personalRemindersSent: 0 });
    expect(db.prepare("SELECT reminder_sent FROM health_events WHERE id = 'event-clock'").get())
      .toEqual({ reminder_sent: 0 });

    now = new Date('2026-07-16T12:00:00.000Z');
    await expect(sendUpcomingReminders(dependencies))
      .resolves.toEqual({ personalRemindersSent: 1 });
    expect(db.prepare("SELECT reminder_sent FROM health_events WHERE id = 'event-clock'").get())
      .toEqual({ reminder_sent: 1 });
  });

  it('sends one provenance-linked personal reminder without manager data or queries', async () => {
    const { db, queries } = createAgendaDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, company_id, title, type, date, time)
      VALUES ('event-1', 'collaborator-ana', 'company-1', 'Mamografia', 'exame', '2026-07-16', '09:15');
      INSERT INTO users (id, company_id, role, also_collaborator) VALUES
        ('collaborator-ana', 'company-1', 'colaboradora', 0),
        ('manager-rh-canary', 'company-1', 'rh', 0),
        ('manager-leadership-canary', 'company-1', 'lideranca', 0);
      INSERT INTO alert_preferences (id, user_id, alert_type, days_before) VALUES
        ('pref-rh', 'manager-rh-canary', 'exame', 7),
        ('pref-leadership', 'manager-leadership-canary', 'all', 7);
      INSERT INTO notification_preferences (user_id, browser_enabled)
      VALUES ('collaborator-ana', 1), ('manager-rh-canary', 1), ('manager-leadership-canary', 1);
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES
        ('push-ana', 'collaborator-ana', 'https://push.test/ana', 'key', 'secret'),
        ('push-rh', 'manager-rh-canary', 'https://push.test/manager-rh-canary', 'key', 'secret'),
        ('push-leadership', 'manager-leadership-canary', 'https://push.test/manager-leadership-canary', 'key', 'secret');
    `);
    const push = vi.fn(async (
      _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
      _payload: { title: string; body: string; icon?: string; url?: string },
    ) => true);
    const runtimeQueryStart = queries.length;

    const result = await sendUpcomingReminders({
      database: db,
      queue: inlineQueue(db),
      push: { enabled: () => true, send: push },
      now: fixedNow,
    });

    const personalNotification = db.prepare(`
      SELECT user_id, type, source, resource_id
      FROM notifications
      WHERE user_id = 'collaborator-ana'
    `).get();
    const managerNotifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id IN ('manager-rh-canary', 'manager-leadership-canary')
    `).all();
    const pushRecipients = push.mock.calls.map(([subscription]) =>
      subscription.endpoint.replace('https://push.test/', 'collaborator-'),
    );
    const pushPayloads = push.mock.calls.map(([, payload]) => payload);

    expect(result).toEqual({ personalRemindersSent: 1 });
    expect(personalNotification).toMatchObject({
      user_id: 'collaborator-ana',
      type: 'reminder',
      source: 'agenda',
      resource_id: 'event-1',
    });
    expect(managerNotifications).toEqual([]);
    expect(pushRecipients).toEqual(['collaborator-ana']);
    expect(JSON.stringify(pushPayloads)).not.toContain('Ana');
    expect(JSON.stringify(push.mock.calls)).not.toContain('manager-rh-canary');
    expect(JSON.stringify(push.mock.calls)).not.toContain('manager-leadership-canary');
    expect(queries.slice(runtimeQueryStart).join('\n')).not.toMatch(/users\.name|alert_preferences/i);
  });

  it('respects a disabled personal browser preference while still creating the reminder', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('event-2', 'collaborator-bia', 'Consulta', 'consulta', '2026-07-16', '09:15');
      INSERT INTO users (id, role) VALUES ('collaborator-bia', 'colaboradora');
      INSERT INTO notification_preferences (user_id, browser_enabled)
      VALUES ('collaborator-bia', 0);
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES ('push-bia', 'collaborator-bia', 'https://push.test/bia', 'key', 'secret');
    `);
    const push = vi.fn(async (
      _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
      _payload: { title: string; body: string; icon?: string; url?: string },
    ) => true);

    const result = await sendUpcomingReminders({
      database: db,
      queue: inlineQueue(db),
      push: { enabled: () => true, send: push },
      now: fixedNow,
    });

    expect(result).toEqual({ personalRemindersSent: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications').get()).toEqual({ count: 1 });
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps the overdue transition personal and independent from reminder delivery', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('overdue-1', 'collaborator-ana', 'Retorno', 'consulta', '2026-07-15', '09:00');
    `);

    const result = await sendUpcomingReminders({
      database: db,
      queue: inlineQueue(db),
      now: fixedNow,
      push: {
        enabled: () => true,
        send: vi.fn(async (
          _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
          _payload: { title: string; body: string; icon?: string; url?: string },
        ) => true),
      },
    });

    expect(result).toEqual({ personalRemindersSent: 0 });
    expect(db.prepare("SELECT status FROM health_events WHERE id = 'overdue-1'").get()).toEqual({ status: 'missed' });
  });

  it('ignores manager-only, revoked, deleted and blocked users even when their events are due', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO users (id, role, also_collaborator, approved, deleted_at, blocked) VALUES
        ('eligible-collaborator', 'colaboradora', 0, 1, NULL, 0),
        ('ordinary-rh', 'rh', 0, 1, NULL, 0),
        ('revoked-dual-rh', 'rh', 1, 0, NULL, 0),
        ('deleted-dual-rh', 'rh', 1, 1, datetime('now'), 0),
        ('blocked-dual-rh', 'rh', 1, 1, NULL, 1);
      INSERT INTO health_events (id, user_id, title, type, date, time) VALUES
        ('event-eligible', 'eligible-collaborator', 'Consulta pessoal', 'consulta', '2026-07-16', '09:15'),
        ('event-ordinary-rh', 'ordinary-rh', 'RH comum', 'consulta', '2026-07-16', '09:15'),
        ('event-revoked', 'revoked-dual-rh', 'Acesso revogado', 'consulta', '2026-07-16', '09:15'),
        ('event-deleted', 'deleted-dual-rh', 'Usuário removido', 'consulta', '2026-07-16', '09:15'),
        ('event-blocked', 'blocked-dual-rh', 'Usuário bloqueado', 'consulta', '2026-07-16', '09:15');
      INSERT INTO notification_preferences (user_id, browser_enabled)
      SELECT id, 1 FROM users;
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      SELECT 'push-' || id, id, 'https://push.test/' || id, 'key', 'secret' FROM users;
    `);
    const push = vi.fn(async (
      _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
      _payload: { title: string; body: string; icon?: string; url?: string },
    ) => true);

    const result = await sendUpcomingReminders({
      database: db,
      queue: inlineQueue(db),
      push: { enabled: () => true, send: push },
      now: fixedNow,
    });

    expect(result).toEqual({ personalRemindersSent: 1 });
    expect(db.prepare('SELECT user_id FROM notifications ORDER BY user_id').all()).toEqual([
      { user_id: 'eligible-collaborator' },
    ]);
    expect(push.mock.calls.map(([subscription]) => subscription.endpoint)).toEqual([
      'https://push.test/eligible-collaborator',
    ]);
  });

  it('rolls back the notification when reminder_sent cannot be updated', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO users (id, role) VALUES ('eligible-collaborator', 'colaboradora');
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('event-atomic', 'eligible-collaborator', 'Consulta pessoal', 'consulta', '2026-07-16', '09:15');
      CREATE TRIGGER fail_reminder_update
      BEFORE UPDATE OF reminder_sent ON health_events
      BEGIN
        SELECT RAISE(ABORT, 'forced reminder update failure');
      END;
    `);

    await expect(sendUpcomingReminders({
      database: db,
      queue: inlineQueue(db),
      push: { enabled: () => false, send: vi.fn() },
      now: fixedNow,
    })).rejects.toThrow('forced reminder update failure');

    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications').get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT reminder_sent FROM health_events WHERE id = 'event-atomic'").get())
      .toEqual({ reminder_sent: 0 });
  });

  it('skips persistence and push when capability is revoked while waiting in the queue', async () => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO users (id, role, approved) VALUES ('revoked-in-queue', 'colaboradora', 1);
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('event-revoked-in-queue', 'revoked-in-queue', 'Consulta pessoal', 'consulta', '2026-07-16', '09:15');
      INSERT INTO notification_preferences (user_id, browser_enabled) VALUES ('revoked-in-queue', 1);
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES ('push-revoked-in-queue', 'revoked-in-queue', 'https://push.test/revoked-in-queue', 'key', 'secret');
    `);
    const push = vi.fn(async (
      _subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
      _payload: { title: string; body: string; icon?: string; url?: string },
    ) => true);
    let revokeBeforeNextCallback = true;
    const revokingQueue = {
      enqueue: async <T>(operation: (writeDb: Database.Database) => T) => {
        if (revokeBeforeNextCallback) {
          revokeBeforeNextCallback = false;
          db.prepare('UPDATE users SET approved = 0 WHERE id = ?').run('revoked-in-queue');
        }
        return operation(db);
      },
    };

    const result = await sendUpcomingReminders({
      database: db,
      queue: revokingQueue,
      push: { enabled: () => true, send: push },
      now: fixedNow,
    });

    expect(result).toEqual({ personalRemindersSent: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications').get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT reminder_sent FROM health_events WHERE id = 'event-revoked-in-queue'").get())
      .toEqual({ reminder_sent: 0 });
    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    {
      transition: 'cancelled',
      mutate: (db: Database.Database) => db.prepare(`
        UPDATE health_events
        SET status = 'cancelled', deleted_at = datetime('now')
        WHERE id = 'event-changed-in-queue'
      `).run(),
    },
    {
      transition: 'rescheduled',
      mutate: (db: Database.Database) => db.prepare(`
        UPDATE health_events
        SET date = '2026-07-17', time = '09:00'
        WHERE id = 'event-changed-in-queue'
      `).run(),
    },
  ])('skips persistence and push when the event is $transition after selection', async ({ mutate }) => {
    const { db } = createAgendaDatabase();
    db.exec(`
      INSERT INTO users (id, role) VALUES ('collaborator-in-queue', 'colaboradora');
      INSERT INTO health_events (id, user_id, title, type, date, time)
      VALUES ('event-changed-in-queue', 'collaborator-in-queue', 'Consulta pessoal', 'consulta', '2026-07-16', '09:15');
      INSERT INTO notification_preferences (user_id, browser_enabled) VALUES ('collaborator-in-queue', 1);
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES ('push-changed-in-queue', 'collaborator-in-queue', 'https://push.test/changed-in-queue', 'key', 'secret');
    `);
    const push = vi.fn(async () => true);
    let mutateBeforeNextCallback = true;
    const changingQueue = {
      enqueue: async <T>(operation: (writeDb: Database.Database) => T) => {
        if (mutateBeforeNextCallback) {
          mutateBeforeNextCallback = false;
          mutate(db);
        }
        return operation(db);
      },
    };

    const result = await sendUpcomingReminders({
      database: db,
      queue: changingQueue,
      push: { enabled: () => true, send: push },
      now: fixedNow,
    });

    expect(result).toEqual({ personalRemindersSent: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications').get()).toEqual({ count: 0 });
    expect(push).not.toHaveBeenCalled();
  });
});

describe('persisted collaborator-self capability', () => {
  it('allows a collaborator and a persisted dual-role user, but denies manager-only roles', async () => {
    const db = new Database(':memory:');
    databases.push(db);
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        also_collaborator INTEGER DEFAULT 0,
        deleted_at TEXT
      );
      INSERT INTO users (id, role, also_collaborator) VALUES
        ('collaborator', 'colaboradora', 0),
        ('dual-rh', 'rh', 1),
        ('manager-rh', 'rh', 0),
        ('manager-admin', 'admin', 0);
    `);
    const modulePath = '@/lib/auth/' + 'collaborator-self';
    const collaboratorSelf = await import(modulePath).catch(() => ({}));
    const canAccess = (collaboratorSelf as {
      hasCollaboratorSelfCapability?: (userId: string, database: Database.Database) => boolean;
    }).hasCollaboratorSelfCapability;
    expect(canAccess).toBeTypeOf('function');
    expect(canAccess?.('collaborator', db)).toBe(true);
    expect(canAccess?.('dual-rh', db)).toBe(true);
    expect(canAccess?.('manager-rh', db)).toBe(false);
    expect(canAccess?.('manager-admin', db)).toBe(false);
  });

  it('revalidates capability after enqueue and before executing a write', async () => {
    const db = new Database(':memory:');
    databases.push(db);
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        also_collaborator INTEGER DEFAULT 0,
        deleted_at TEXT
      );
      INSERT INTO users (id, role, also_collaborator) VALUES ('dual-rh', 'rh', 1);
    `);
    const modulePath = '@/lib/auth/' + 'collaborator-self';
    const collaboratorSelf = await import(modulePath);
    const enqueueWrite = (collaboratorSelf as {
      enqueueCollaboratorSelfWrite?: <T>(
        queue: { enqueue(operation: (database: Database.Database) => T): Promise<T> },
        userId: string,
        operation: (database: Database.Database) => T,
      ) => Promise<T>;
    }).enqueueCollaboratorSelfWrite;
    expect(enqueueWrite).toBeTypeOf('function');
    const operation = vi.fn(() => 'written');
    const revokingQueue = {
      enqueue: async <T>(callback: (database: Database.Database) => T) => {
        db.prepare('UPDATE users SET also_collaborator = 0 WHERE id = ?').run('dual-rh');
        return callback(db);
      },
    };

    await expect(enqueueWrite?.(revokingQueue, 'dual-rh', operation)).rejects.toMatchObject({ status: 403 });
    expect(operation).not.toHaveBeenCalled();
  });
});
