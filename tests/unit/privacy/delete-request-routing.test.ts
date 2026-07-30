import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
  id: 0,
}));

vi.mock('nanoid', () => ({
  nanoid: () => {
    runtime.id += 1;
    return `delete-request-id-${runtime.id}`;
  },
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: any[]) => unknown) => handler,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!runtime.db) throw new Error('test database not configured');
      return operation(runtime.db);
    },
  }),
}));

import { POST } from '@/app/api/users/me/delete-request/route';

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT
    );
    CREATE TABLE activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT
    );

    INSERT INTO users (id, company_id, name, email, role) VALUES
      ('master-admin', NULL, 'Master', 'master@example.test', 'admin'),
      ('company-admin', 'company-a', 'Admin A', 'admin-a@example.test', 'admin'),
      ('other-admin', 'company-b', 'Admin B', 'admin-b@example.test', 'admin'),
      ('rh-a', 'company-a', 'RH A', 'rh-a@example.test', 'rh'),
      ('collab-a', 'company-a', 'Ana', 'ana@example.test', 'colaboradora');
  `);
  return db;
}

beforeEach(() => {
  runtime.db = createDatabase();
  runtime.id = 0;
});

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

describe('delete request notification routing', () => {
  it('notifies master admins and same-company admins without leaking to other companies', async () => {
    const response = await POST(new Request('http://localhost/api/users/me/delete-request') as never, {
      auth: { userId: 'collab-a', role: 'colaboradora', companyId: 'company-a' },
    } as never);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);

    const notifications = runtime.db!.prepare(`
      SELECT user_id, type, title, message
      FROM notifications
      ORDER BY user_id
    `).all() as Array<{ user_id: string; type: string; title: string; message: string }>;

    expect(notifications.map((notification) => notification.user_id)).toEqual([
      'company-admin',
      'master-admin',
    ]);
    for (const notification of notifications) {
      expect(notification.type).toBe('system');
      expect(notification.title).toMatch(/exclus/i);
      expect(notification.message).toContain('collab-a');
    }

    const activity = runtime.db!.prepare(`
      SELECT user_id, action
      FROM activity_log
    `).get() as { user_id: string; action: string };
    expect(activity).toEqual({
      user_id: 'collab-a',
      action: 'account_deletion_request',
    });
  });
});
