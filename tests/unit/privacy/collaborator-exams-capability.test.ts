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

import { GET as listExams, POST as createExam } from '@/app/api/collaborator/exams/route';

type Auth = {
  userId: string;
  companyId: string;
  role: 'colaboradora' | 'rh' | 'admin' | 'lideranca';
  email: string;
};

type Handler = (request: Request, context: { auth: Auth }) => Promise<Response>;

const collaboratorAuth: Auth = {
  userId: 'collaborator-1',
  companyId: 'company-1',
  role: 'colaboradora',
  email: 'ana@example.test',
};

const dualRoleAuth: Auth = {
  userId: 'dual-rh-1',
  companyId: 'company-1',
  role: 'rh',
  email: 'dual@example.test',
};

const rhAuth: Auth = {
  userId: 'rh-1',
  companyId: 'company-1',
  role: 'rh',
  email: 'rh@example.test',
};

const adminAuth: Auth = {
  userId: 'admin-1',
  companyId: 'company-1',
  role: 'admin',
  email: 'admin@example.test',
};

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
    CREATE TABLE user_exams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date TEXT,
      completed_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO users (id, role, also_collaborator, company_id, approved, blocked) VALUES
      ('collaborator-1', 'colaboradora', 0, 'company-1', 1, 0),
      ('dual-rh-1', 'rh', 1, 'company-1', 1, 0),
      ('rh-1', 'rh', 0, 'company-1', 1, 0),
      ('admin-1', 'admin', 0, 'company-1', 1, 0);
    INSERT INTO user_exams (id, user_id, exam_name, status) VALUES
      ('exam-collaborator', 'collaborator-1', 'Mamografia', 'completed'),
      ('exam-dual', 'dual-rh-1', 'Glicemia', 'completed'),
      ('exam-rh', 'rh-1', 'Hemograma', 'completed');
  `);
  return db;
}

function getExamCount(userId: string): number {
  return (runtime.db!.prepare('SELECT COUNT(*) AS count FROM user_exams WHERE user_id = ?').get(userId) as { count: number }).count;
}

function callList(auth: Auth): Promise<Response> {
  return (listExams as unknown as Handler)(new Request('http://localhost/api/collaborator/exams'), { auth });
}

function callCreate(auth: Auth): Promise<Response> {
  return (createExam as unknown as Handler)(new Request('http://localhost/api/collaborator/exams', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ exam_name: 'Glicemia', completed_date: '2026-07-29' }),
  }), { auth });
}

beforeEach(() => {
  runtime.db = createDatabase();
});

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

describe('Collaborator exams capability gate', () => {
  it.each([
    ['collaborator', collaboratorAuth],
    ['dual-role RH with persisted collaborator capability', dualRoleAuth],
  ])('allows %s to list and create only personal exams', async (_case, auth) => {
    const listResponse = await callList(auth);
    expect(listResponse.status).toBe(200);
    const payload = await listResponse.json() as { exams: Array<{ id: string }> };
    expect(payload.exams).toHaveLength(1);

    const before = getExamCount(auth.userId);
    const createResponse = await callCreate(auth);
    expect(createResponse.status).toBe(200);
    expect(getExamCount(auth.userId)).toBe(before + 1);
  });

  it.each([
    ['RH without collaborator capability', rhAuth],
    ['admin without collaborator capability', adminAuth],
  ])('denies %s without exposing or creating personal exam data', async (_case, auth) => {
    const before = getExamCount(auth.userId);

    const listResponse = await callList(auth);
    expect(listResponse.status).toBe(403);

    const createResponse = await callCreate(auth);
    expect(createResponse.status).toBe(403);
    expect(getExamCount(auth.userId)).toBe(before);
  });
});
