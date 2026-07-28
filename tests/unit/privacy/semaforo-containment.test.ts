import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
  initCalls: 0,
}));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: unknown[]) => unknown) => handler;
  return { withAuth: expose, withRole: () => expose, withMasterAdmin: expose };
});
vi.mock('@/lib/db/init', () => ({
  initDb: async () => {
    runtime.initCalls += 1;
  },
}));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!runtime.db) throw new Error('database not configured');
    return runtime.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!runtime.db) throw new Error('database not configured');
      return operation(runtime.db);
    },
  }),
}));

import { GET as getSemaforo, POST as postSemaforo, DELETE as deleteSemaforo } from '@/app/api/collaborator/semaforo/route';
import { GET as getSemaforoHistory } from '@/app/api/collaborator/semaforo/history/route';
import { POST as recalculateSemaforoRoute } from '@/app/api/collaborator/semaforo/recalculate/route';
import * as calculator from '@/services/semaforo-calculator.service';
import * as healthScores from '@/repositories/health-score.repository';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const selfReportMigrationPath = path.join(root, 'src', 'lib', 'db', 'migrations', '063_personal_semaforo_self_reports.sql');

const collaboratorAuth = {
  userId: 'user-1',
  companyId: 'company-1',
  role: 'colaboradora',
  email: 'ana@example.test',
};
const rhAuth = {
  userId: 'rh-1',
  companyId: 'company-1',
  role: 'rh',
  email: 'rh@example.test',
};

type Auth = typeof collaboratorAuth;
type RouteHandler = (request: Request, context: { auth: Auth }) => Promise<Response>;

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
  runtime.initCalls = 0;
});

function useDatabase() {
  const db = new Database(':memory:');
  runtime.db = db;
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      role TEXT,
      also_collaborator INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      blocked INTEGER DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      target_type TEXT,
      target_id TEXT,
      points_earned INTEGER DEFAULT 0,
      created_at TEXT
    );
    CREATE TABLE health_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      dimension TEXT,
      score REAL,
      status TEXT,
      recorded_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO users (id, company_id, role, also_collaborator, approved, blocked)
    VALUES ('user-1', 'company-1', 'colaboradora', 0, 1, 0),
           ('rh-1', 'company-1', 'rh', 0, 1, 0),
           ('dual-1', 'company-1', 'rh', 1, 1, 0);
    INSERT INTO health_scores (id, user_id, dimension, score, status)
    VALUES ('legacy-health-1', 'user-1', 'Sono', 7.7, 'yellow');
  `);
  applyMigration(db, '063_personal_semaforo_self_reports.sql', fs.readFileSync(selfReportMigrationPath, 'utf8'));
  return db;
}

async function call(handler: unknown, request: Request, auth = collaboratorAuth) {
  return (handler as RouteHandler)(request, { auth });
}

function healthSnapshot(db: Database.Database) {
  return db.prepare('SELECT * FROM health_scores ORDER BY id').all();
}

describe('Semaforo private self-report', () => {
  it('applies the private self-report migration once', () => {
    const db = new Database(':memory:');
    runtime.db = db;
    db.exec('CREATE TABLE users (id TEXT PRIMARY KEY);');
    const sql = fs.readFileSync(selfReportMigrationPath, 'utf8');

    expect(applyMigration(db, '063_personal_semaforo_self_reports.sql', sql)).toBe('applied');
    expect(applyMigration(db, '063_personal_semaforo_self_reports.sql', sql)).toBe('skipped');

    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'personal_semaforo_entries'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'personal_semaforo_consents'").get()).toBeTruthy();
  });

  it('starts empty, creates only self-owned private entries and keeps legacy health_scores untouched', async () => {
    const db = useDatabase();
    const before = healthSnapshot(db);

    const initial = await call(getSemaforo, new Request('http://localhost/api/collaborator/semaforo'));
    expect(initial.status).toBe(200);
    expect(initial.headers.get('cache-control')).toBe('private, no-store');
    await expect(initial.json()).resolves.toMatchObject({
      status: 'private_self_report',
      diagnostic: false,
      companyVisible: false,
      consent: { accepted: false, retentionDays: 180 },
      latest: null,
    });

    const rejected = await call(postSemaforo, new Request('http://localhost/api/collaborator/semaforo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consentAccepted: false, signal: 'green', energy: 'steady' }),
    }));
    expect(rejected.status).toBe(400);

    const created = await call(postSemaforo, new Request('http://localhost/api/collaborator/semaforo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        consentAccepted: true,
        signal: 'yellow',
        energy: 'low',
        note: 'Semana pesada',
      }),
    }));
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toMatchObject({
      consent: { accepted: true, version: 'personal-semaforo-v1' },
      latest: {
        signal: 'yellow',
        signalLabel: 'Preciso observar',
        energy: 'low',
        energyLabel: 'Baixa',
        note: 'Semana pesada',
      },
    });

    const history = await call(getSemaforoHistory, new Request('http://localhost/api/collaborator/semaforo/history'));
    expect(history.status).toBe(200);
    await expect(history.json()).resolves.toMatchObject({
      status: 'private_self_report_history',
      diagnostic: false,
      companyVisible: false,
      entries: [{ signal: 'yellow', note: 'Semana pesada' }],
    });
    expect(healthSnapshot(db)).toEqual(before);
  });

  it('denies RH without collaborator capability and allows persisted dual-role collaborator capability', async () => {
    useDatabase();

    const rhDenied = await call(getSemaforo, new Request('http://localhost/api/collaborator/semaforo'), rhAuth);
    expect(rhDenied.status).toBe(403);

    const dualAllowed = await call(getSemaforo, new Request('http://localhost/api/collaborator/semaforo'), {
      ...rhAuth,
      userId: 'dual-1',
    });
    expect(dualAllowed.status).toBe(200);
  });

  it('deletes private entries, revokes consent and records only a count audit', async () => {
    const db = useDatabase();

    await call(postSemaforo, new Request('http://localhost/api/collaborator/semaforo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consentAccepted: true, signal: 'red', energy: 'low', note: 'Apagar depois' }),
    }));

    const deleted = await call(deleteSemaforo, new Request('http://localhost/api/collaborator/semaforo', { method: 'DELETE' }));
    expect(deleted.status).toBe(200);
    await expect(deleted.json()).resolves.toEqual({ success: true, deletedCount: 1 });

    expect(db.prepare('SELECT COUNT(*) AS count FROM personal_semaforo_entries WHERE user_id = ?').get('user-1')).toEqual({ count: 0 });
    expect(db.prepare('SELECT revoked_at IS NOT NULL AS revoked FROM personal_semaforo_consents WHERE user_id = ?').get('user-1')).toEqual({ revoked: 1 });
    expect(db.prepare('SELECT action, target_type, target_id, points_earned FROM activity_log WHERE user_id = ?').get('user-1')).toEqual({
      action: 'personal_semaforo_deleted',
      target_type: 'personal_semaforo',
      target_id: '1',
      points_earned: 0,
    });
  });

  it('keeps legacy Semaforo recalculation and health score writers quarantined', async () => {
    const { SemaforoContainmentError } = await import('@/lib/semaforo/containment');

    const recalculation = await call(recalculateSemaforoRoute, new Request('http://localhost/api/collaborator/semaforo/recalculate', { method: 'POST' }));
    expect(recalculation.status).toBe(423);
    await expect(recalculation.json()).resolves.toMatchObject({ status: 'under_review' });

    await expect(calculator.recalculateSemaforo('user-1')).rejects.toBeInstanceOf(SemaforoContainmentError);
    await expect(calculator.recalculateCompanySemaforo('company-1')).rejects.toBeInstanceOf(SemaforoContainmentError);
    await expect(calculator.recalculateAllSemaforos()).rejects.toBeInstanceOf(SemaforoContainmentError);
    await expect(healthScores.recordHealthScore('user-1', 'Sono', 8)).rejects.toBeInstanceOf(SemaforoContainmentError);
    expect(() => healthScores.getLatestHealthScores('user-1')).toThrow(SemaforoContainmentError);
    expect(() => healthScores.getHealthScoreHistory('user-1', 'Sono')).toThrow(SemaforoContainmentError);
    expect(() => healthScores.getCompanyHealthOverview('company-1')).toThrow(SemaforoContainmentError);
  });

  it('keeps source boundaries free of score-derived Semaforo UI and RH/Admin readers', () => {
    const page = read('src/app/(platform)/semaforo/page.tsx');
    expect(page).toContain('Auto-relato privado');
    expect(page).toContain('companyVisible: false');
    expect(page).not.toMatch(/health_scores|score|recalculate|ranking/i);

    for (const route of [
      'src/app/api/collaborator/semaforo/route.ts',
      'src/app/api/collaborator/semaforo/history/route.ts',
      'src/lib/semaforo/self-report.ts',
    ]) {
      const source = read(route);
      expect(source, route).not.toMatch(/health_scores|recordHealthScore|recalculateSemaforo/i);
    }

    const rhSources = [
      'src/app/api/rh/users/[id]/route.ts',
      'src/app/api/leader/team/route.ts',
      'src/app/api/admin/users/[id]/route.ts',
    ].map(read).join('\n');
    expect(rhSources).not.toMatch(/personal_semaforo|personalSemaforo/i);
  });
});
