import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!runtime.db) throw new Error('test database not configured');
    return runtime.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!runtime.db) throw new Error('test database not configured');
      return operation(runtime.db);
    },
  }),
}));

import { POST as createAgendaEvent } from '@/app/api/collaborator/agenda/route';

const auth = { userId: 'user-1', companyId: 'company-1', role: 'colaboradora', email: 'ana@example.test' };

type Handler = (request: Request, context: { auth: typeof auth }) => Promise<Response>;

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      also_collaborator INTEGER DEFAULT 0,
      company_id TEXT,
      approved INTEGER DEFAULT 1,
      blocked INTEGER DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE health_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      deleted_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL
    );
    INSERT INTO users (id, role, company_id, approved)
    VALUES ('user-1', 'colaboradora', 'company-1', 1);
  `);
  return db;
}

async function callCreate(body: unknown): Promise<Response> {
  return (createAgendaEvent as unknown as Handler)(new Request('http://localhost/api/collaborator/agenda', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }), { auth });
}

beforeEach(() => {
  runtime.db = createDatabase();
});

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

describe('Agenda POST route validation', () => {
  it.each([
    ['impossible date', { title: 'Consulta', type: 'consulta', date: '2026-02-31', time: '09:30' }],
    ['invalid time', { title: 'Consulta', type: 'consulta', date: '2026-07-16', time: '24:01' }],
    ['unknown field', { title: 'Consulta', type: 'consulta', date: '2026-07-16', company_id: 'other-company' }],
  ])('rejects %s without creating a health event', async (_case, body) => {
    const response = await callCreate(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'Dados inválidos' });
    expect(runtime.db!.prepare('SELECT COUNT(*) AS count FROM health_events').get()).toEqual({ count: 0 });
  });
});
