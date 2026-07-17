import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

const runtime = vi.hoisted(() => ({
  db: null as Database.Database | null,
  dbAccesses: 0,
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
    runtime.dbAccesses += 1;
    if (!runtime.db) throw new Error('database access forbidden');
    return runtime.db;
  },
  getWriteQueue: () => {
    runtime.dbAccesses += 1;
    return {
      enqueue: async (operation: (db: Database.Database) => unknown) => {
        if (!runtime.db) throw new Error('database access forbidden');
        return operation(runtime.db);
      },
    };
  },
}));

import { GET as getSemaforo } from '@/app/api/collaborator/semaforo/route';
import { GET as getSemaforoHistory } from '@/app/api/collaborator/semaforo/history/route';
import { POST as recalculateSemaforoRoute } from '@/app/api/collaborator/semaforo/recalculate/route';
import { POST as submitQuiz } from '@/app/api/quiz/submit/route';
import { POST as checkIn } from '@/app/api/gamification/check-in/route';
import { POST as createExam } from '@/app/api/collaborator/exams/route';
import { GET as getNotificationPreferences, PATCH as patchNotificationPreferences } from '@/app/api/users/me/notification-preferences/route';
import * as calculator from '@/services/semaforo-calculator.service';
import * as healthScores from '@/repositories/health-score.repository';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const neutralState = {
  status: 'under_review',
  label: 'Em revisão',
  message: 'Estamos revisando este recurso para separar cuidado e gamificação.',
};
const auth = {
  userId: 'user-1',
  companyId: 'company-1',
  role: 'colaboradora',
  email: 'ana@example.test',
};
type RouteHandler = (request: Request, context: { auth: typeof auth }) => Promise<Response>;

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
  runtime.dbAccesses = 0;
  runtime.initCalls = 0;
});

function useDatabase() {
  const db = new Database(':memory:');
  runtime.db = db;
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, company_id TEXT, streak INTEGER, last_active TEXT, updated_at TEXT, deleted_at TEXT, blocked INTEGER, role TEXT);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, created_at TEXT);
    CREATE TABLE user_challenges (id TEXT PRIMARY KEY, user_id TEXT, status TEXT);
    CREATE TABLE daily_missions (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, xp INTEGER, category TEXT, action TEXT, day TEXT, completed INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, action TEXT, day TEXT, note TEXT, completed_at TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE user_exams (id TEXT PRIMARY KEY, user_id TEXT, exam_name TEXT, status TEXT, completed_date TEXT, due_date TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, dimension TEXT, score REAL, status TEXT, recorded_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE archetypes (id TEXT PRIMARY KEY, key TEXT, name TEXT, description TEXT, base_scores TEXT, growth_30 TEXT, growth_60 TEXT, growth_90 TEXT, missions INTEGER, campaigns INTEGER, habits INTEGER);
    CREATE TABLE quiz_results (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, archetype_id TEXT, answers_json TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE notification_preferences (user_id TEXT PRIMARY KEY, reminder_times TEXT NOT NULL, mission_reminders TEXT NOT NULL, browser_enabled INTEGER NOT NULL, updated_at TEXT);
    INSERT INTO users VALUES ('user-1', 'company-1', 4, NULL, '2026-01-01', NULL, 0, 'colaboradora');
    INSERT INTO health_scores VALUES ('health-1', 'user-1', 'Sono', 7.7, 'yellow', '2026-01-01');
    INSERT INTO archetypes VALUES ('arch-1', 'guardia', 'Guardiã', 'Conclusão educacional', '{}', '{}', '{}', '{}', 0, 0, 0);
  `);
  return db;
}

function healthSnapshot(db: Database.Database) {
  return db.prepare('SELECT * FROM health_scores ORDER BY id').all();
}

async function call(handler: unknown, request: Request) {
  return (handler as RouteHandler)(request, { auth });
}

function expectNeutralResponse(response: Response, status = 200) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('vary')).toBe('Cookie');
  return expect(response.json()).resolves.toEqual(neutralState);
}

describe('Semáforo privacy containment', () => {
  it('exports one immutable neutral state and a typed containment error', async () => {
    const modulePath = '@/lib/semaforo/' + 'containment';
    const containment = await import(modulePath).catch(() => ({}));
    const state = (containment as { SEMAFORO_REVIEW_STATE?: unknown }).SEMAFORO_REVIEW_STATE;
    const ErrorType = (containment as { SemaforoContainmentError?: new () => Error & { code?: string } }).SemaforoContainmentError;

    expect(state).toEqual(neutralState);
    expect(Object.isFrozen(state)).toBe(true);
    expect(ErrorType).toBeTypeOf('function');
    const error = new ErrorType!();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SemaforoContainmentError');
    expect(error.code).toBe('SEMAFORO_CONTAINED');
  });

  it('returns only the neutral state from all three routes without initializing or accessing the database', async () => {
    useDatabase();
    const before = healthSnapshot(runtime.db!);
    const accesses = runtime.dbAccesses;
    const initCalls = runtime.initCalls;

    await expectNeutralResponse(await call(getSemaforo, new Request('http://localhost/api/collaborator/semaforo')));
    await expectNeutralResponse(await call(getSemaforoHistory, new Request('http://localhost/api/collaborator/semaforo/history')));
    await expectNeutralResponse(await call(recalculateSemaforoRoute, new Request('http://localhost/api/collaborator/semaforo/recalculate', { method: 'POST' })), 423);

    expect(runtime.dbAccesses).toBe(accesses);
    expect(runtime.initCalls).toBe(initCalls);
    expect(healthSnapshot(runtime.db!)).toEqual(before);
  });

  it('fail-closes every recalculation and writer entry point with the typed error before database access', async () => {
    const modulePath = '@/lib/semaforo/' + 'containment';
    const { SemaforoContainmentError } = await import(modulePath) as {
      SemaforoContainmentError: new () => Error;
    };

    for (const operation of [
      () => calculator.recalculateSemaforo('user-1'),
      () => calculator.recalculateCompanySemaforo('company-1'),
      () => calculator.recalculateAllSemaforos(),
      () => healthScores.recordHealthScore('user-1', 'Sono', 8),
    ]) {
      const accesses = runtime.dbAccesses;
      await expect(operation()).rejects.toBeInstanceOf(SemaforoContainmentError);
      expect(runtime.dbAccesses).toBe(accesses);
    }
  });

  it('keeps quiz completion, check-in and exam creation while preserving health_scores exactly', async () => {
    const db = useDatabase();
    const before = healthSnapshot(db);

    const quizResponse = await call(submitQuiz, new Request('http://localhost/api/quiz/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archetypeKey: 'guardia', answers: [1, 2, 3, 4, 5, 6] }),
    }));
    expect(quizResponse.status).toBe(200);
    expect(await quizResponse.json()).toMatchObject({ success: true, archetypeKey: 'guardia' });
    expect(db.prepare('SELECT archetype_id, answers_json FROM quiz_results WHERE user_id = ?').get('user-1')).toEqual({
      archetype_id: 'arch-1',
      answers_json: '[1,2,3,4,5,6]',
    });
    expect(healthSnapshot(db)).toEqual(before);

    const checkInResponse = await call(checkIn, new Request('http://localhost/api/gamification/check-in', { method: 'POST' }));
    expect(checkInResponse.status).toBe(200);
    expect(healthSnapshot(db)).toEqual(before);

    const examResponse = await call(createExam, new Request('http://localhost/api/collaborator/exams', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exam_name: 'Hemograma', completed_date: '2026-07-16' }),
    }));
    expect(examResponse.status).toBe(200);
    expect(db.prepare('SELECT exam_name, status FROM user_exams WHERE user_id = ?').get('user-1')).toEqual({
      exam_name: 'Hemograma',
      status: 'completed',
    });
    expect(healthSnapshot(db)).toEqual(before);
  });

  it('rejects the removed reminder key and strips it from defaults and legacy rows without losing legitimate preferences', async () => {
    const db = useDatabase();

    const defaultResponse = await call(getNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences'));
    expect(defaultResponse.status).toBe(200);
    expect(await defaultResponse.json()).toEqual({
      prefs: {
        reminder_times: ['08:00', '18:00'],
        mission_reminders: { check_in: true, drink_water: true, complete_challenge: true },
        browser_enabled: false,
      },
    });

    db.prepare(`
      INSERT INTO notification_preferences (user_id, reminder_times, mission_reminders, browser_enabled)
      VALUES (?, ?, ?, ?)
    `).run('user-1', '["09:30"]', '{"check_in":false,"drink_water":true,"complete_challenge":false,"update_semaforo":true,"unknown":true}', 0);

    const legacyResponse = await call(getNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences'));
    expect((await legacyResponse.json()).prefs.mission_reminders).toEqual({
      check_in: false,
      drink_water: true,
      complete_challenge: false,
    });

    const rejected = await call(patchNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ browser_enabled: true, mission_reminders: { check_in: true, update_semaforo: false } }),
    }));
    expect(rejected.status).toBe(400);

    const accepted = await call(patchNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ browser_enabled: true }),
    }));
    expect(accepted.status).toBe(200);
    const persisted = db.prepare('SELECT reminder_times, mission_reminders, browser_enabled FROM notification_preferences WHERE user_id = ?').get('user-1');
    expect(persisted).toEqual({
      reminder_times: '["09:30"]',
      mission_reminders: '{"check_in":false,"drink_water":true,"complete_challenge":false}',
      browser_enabled: 1,
    });
  });

  it.each([
    ['malformed JSON', 'not-json'],
    ['JSON string', '"09:30"'],
    ['JSON object', '{"time":"09:30"}'],
    ['impossible time', '["29:99"]'],
  ])('falls back from legacy %s reminder_times and persists the sanitized value on an unrelated PATCH', async (_case, legacyTimes) => {
    const db = useDatabase();
    db.prepare(`
      INSERT INTO notification_preferences (user_id, reminder_times, mission_reminders, browser_enabled)
      VALUES (?, ?, ?, ?)
    `).run('user-1', legacyTimes, '{"read_content":true}', 0);

    const getResponse = await call(getNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences'));
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).prefs.reminder_times).toEqual(['08:00', '18:00']);

    const patchResponse = await call(patchNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ browser_enabled: true }),
    }));
    expect(patchResponse.status).toBe(200);
    expect(db.prepare('SELECT reminder_times, browser_enabled FROM notification_preferences WHERE user_id = ?').get('user-1')).toEqual({
      reminder_times: '["08:00","18:00"]',
      browser_enabled: 1,
    });
  });

  it('rejects impossible reminder_times through the PATCH schema', async () => {
    useDatabase();
    const response = await call(patchNotificationPreferences, new Request('http://localhost/api/users/me/notification-preferences', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reminder_times: ['29:99'] }),
    }));
    expect(response.status).toBe(400);
  });

  it('applies migration 050 once to sanitize legacy rows and replace the contaminated schema default', () => {
    const db = new Database(':memory:');
    runtime.db = db;
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY);
      CREATE TABLE notification_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        reminder_times TEXT NOT NULL DEFAULT '["08:00","18:00"]',
        mission_reminders TEXT NOT NULL DEFAULT '{"check_in":true,"drink_water":true,"complete_challenge":true,"update_semaforo":true}',
        browser_enabled INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users VALUES ('user-1'), ('user-2'), ('user-3');
      INSERT INTO _migrations (name) VALUES ('015_notification_preferences.sql');
    `);
    db.prepare(`
      INSERT INTO notification_preferences (user_id, reminder_times, mission_reminders, browser_enabled, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'user-1',
      '["09:30","18:45"]',
      '{"read_content":true,"check_in":false,"drink_water":true,"complete_challenge":false,"update_semaforo":true,"unknown":true}',
      1,
      '2026-01-02 03:04:05',
    );
    db.prepare(`
      INSERT INTO notification_preferences (user_id, reminder_times, mission_reminders, browser_enabled, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('user-2', '["11:45"]', 'not-json', 0, '2026-02-03 04:05:06');

    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '050_semaforo_notification_preferences_containment.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    if (!fs.existsSync(migrationPath)) return;
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(applyMigration(db, '050_semaforo_notification_preferences_containment.sql', sql)).toBe('applied');
    expect(applyMigration(db, '050_semaforo_notification_preferences_containment.sql', sql)).toBe('skipped');

    expect(db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get('user-1')).toEqual({
      user_id: 'user-1',
      reminder_times: '["09:30","18:45"]',
      mission_reminders: '{"read_content":true,"check_in":false,"drink_water":true,"complete_challenge":false}',
      browser_enabled: 1,
      updated_at: '2026-01-02 03:04:05',
    });
    expect(db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get('user-2')).toEqual({
      user_id: 'user-2',
      reminder_times: '["11:45"]',
      mission_reminders: '{}',
      browser_enabled: 0,
      updated_at: '2026-02-03 04:05:06',
    });

    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notification_preferences'").get() as { sql: string };
    const columns = db.prepare('PRAGMA table_info(notification_preferences)').all() as Array<{ name: string; dflt_value: string | null }>;
    expect(schema.sql).not.toMatch(/update_semaforo/i);
    expect(columns.find(({ name }) => name === 'mission_reminders')?.dflt_value).not.toMatch(/update_semaforo/i);

    db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run('user-3');
    expect(db.prepare('SELECT reminder_times, mission_reminders, browser_enabled FROM notification_preferences WHERE user_id = ?').get('user-3')).toEqual({
      reminder_times: '["08:00","18:00"]',
      mission_reminders: '{"check_in":true,"drink_water":true,"complete_challenge":true}',
      browser_enabled: 0,
    });
    expect(db.prepare('SELECT name FROM _migrations ORDER BY id').all()).toEqual([
      { name: '015_notification_preferences.sql' },
      { name: '050_semaforo_notification_preferences_containment.sql' },
    ]);
  });

  it('removes clinical and score-derived behavior from routes and platform UI sources', () => {
    const semaforoPage = read('src/app/(platform)/semaforo/page.tsx');
    expect(semaforoPage).toContain('FeedbackState');
    expect(semaforoPage).toContain('Semáforo da Saúde');
    expect(semaforoPage).toContain('title={SEMAFORO_REVIEW_STATE.label}');
    expect(semaforoPage).toContain('description={SEMAFORO_REVIEW_STATE.message}');
    expect(semaforoPage).not.toMatch(/useSWR|fetch\s*\(|history|dimension|score|recorded_at|reminder|green|yellow|red|filter|useSearchParams|Modal|Input/i);

    const configurations = read('src/app/(platform)/configuracoes/page.tsx');
    expect(configurations).not.toMatch(/update_semaforo/i);

    const reminderPopup = read('src/components/platform/ReminderPopup.tsx');
    expect(reminderPopup).not.toMatch(/Urgente|Saud[aá]vel|status\s*===?\s*['"]red['"]|\/api\/collaborator\/semaforo|semaforoDimension|SemaforoItem|\/semaforo\?focus=|focusedSemaforo|dimension|score/i);

    for (const route of [
      'src/app/api/collaborator/semaforo/route.ts',
      'src/app/api/collaborator/semaforo/history/route.ts',
      'src/app/api/collaborator/semaforo/recalculate/route.ts',
    ]) {
      const source = read(route);
      expect(source, route).toContain('SEMAFORO_REVIEW_STATE');
      expect(source, route).not.toMatch(/health_scores|dimension|score|recorded_at|getReadDb|getWriteQueue|initDb|recalculateSemaforo/i);
    }

    expect(read('src/app/api/quiz/submit/route.ts')).not.toMatch(/health-score|recordHealthScore|recalculateSemaforo|health_scores/i);
    expect(read('src/app/api/users/me/notification-preferences/route.ts')).not.toMatch(/update_semaforo/i);
    expect(read('src/lib/db/migrations/015_notification_preferences.sql')).not.toMatch(/update_semaforo/i);
  });

  it('leaves no reachable caller for quarantined Semáforo writers', () => {
    const directories = ['src/app', 'src/components', 'src/services', 'src/repositories'];
    const allowed = new Set([
      path.normalize('src/services/semaforo-calculator.service.ts'),
      path.normalize('src/repositories/health-score.repository.ts'),
    ]);
    const residual: string[] = [];

    function scan(directory: string) {
      for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const relativePath = path.join(directory, entry.name);
        if (entry.isDirectory()) scan(relativePath);
        else if (/\.(?:ts|tsx)$/.test(entry.name) && !allowed.has(path.normalize(relativePath))) {
          const source = read(relativePath);
          if (/recalculateSemaforo|recordHealthScore|INSERT INTO health_scores/.test(source)) residual.push(relativePath);
        }
      }
    }

    directories.forEach(scan);
    expect(residual).toEqual([]);
  });
});
