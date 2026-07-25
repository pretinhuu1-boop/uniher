import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

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

import { POST as checkIn } from '@/app/api/gamification/check-in/route';
import { GET as getStreakStatus } from '@/app/api/gamification/streak-status/route';
import { POST as checkOut } from '@/app/api/wellbeing/check-out/route';
import { GET as getDailyStatus } from '@/app/api/wellbeing/daily-status/route';
import { createDsarExportJsonChunks } from '@/lib/privacy/dsar-export';
import { isWellbeingMood, WELLBEING_MOODS } from '@/services/wellbeing.service';

const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '061_wellbeing_events.sql');
const auth = { userId: 'user-1', companyId: 'company-1', role: 'colaboradora', email: 'ana@example.test' };

type Handler = (request: Request, context: { auth: typeof auth; params?: Promise<Record<string, string>> }) => Promise<Response>;

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      department_id TEXT,
      company_id TEXT,
      avatar_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      points INTEGER,
      level INTEGER,
      league TEXT,
      streak INTEGER,
      last_active TEXT,
      profile_updated_at TEXT
    );
    CREATE TABLE quiz_results (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, archetype_id TEXT, answers_json TEXT, created_at TEXT);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT, message TEXT, read INTEGER, created_at TEXT);
    CREATE TABLE badges (id TEXT PRIMARY KEY, name TEXT, description TEXT);
    CREATE TABLE user_badges (user_id TEXT NOT NULL, badge_id TEXT NOT NULL, unlocked_at TEXT, PRIMARY KEY (user_id, badge_id));
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, dimension TEXT, score REAL, recorded_at TEXT);
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE user_challenges (
      user_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      progress INTEGER,
      status TEXT,
      started_at TEXT,
      completed_at TEXT,
      PRIMARY KEY (user_id, challenge_id)
    );
    CREATE TABLE activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT,
      target_type TEXT,
      target_id TEXT,
      points_earned INTEGER,
      created_at TEXT
    );
    CREATE TABLE mission_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mission_id TEXT,
      action TEXT,
      day TEXT,
      mood TEXT,
      glasses INTEGER,
      challenge_id TEXT,
      note TEXT,
      created_at TEXT
    );
    CREATE TABLE daily_missions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      description TEXT,
      xp INTEGER,
      category TEXT,
      action TEXT,
      day TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO companies VALUES ('company-1');
    INSERT INTO users VALUES (
      'user-1', 'Ana', 'ana@example.test', 'colaboradora', NULL, 'company-1',
      NULL, '2026-01-01', '2026-01-01', 731, 8, 'bronze', 4, NULL, '2026-01-01'
    );
  `);
  applyMigration(db, '061_wellbeing_events.sql', fs.readFileSync(migrationPath, 'utf8'));
  return db;
}

async function call(handler: unknown, pathName: string, init?: RequestInit): Promise<Response> {
  return (handler as Handler)(new Request(`http://localhost${pathName}`, init), { auth });
}

function legacySnapshot(db: Database.Database) {
  return db.prepare('SELECT points, level FROM users WHERE id = ?').get('user-1');
}

beforeEach(() => {
  runtime.db = createDatabase();
});

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

describe('wellbeing check-in/check-out foundation', () => {
  it('exposes a closed mood set with no free-text wellbeing value', () => {
    expect(WELLBEING_MOODS).toEqual([
      'muito_bem',
      'bem',
      'neutra',
      'cansada',
      'sobrecarregada',
      'nao_informado',
    ]);
    expect(isWellbeingMood('bem')).toBe(true);
    expect(isWellbeingMood('ansiosa porque meu gestor...')).toBe(false);
  });

  it('records one daily check-in and one daily check-out without changing legacy points or level', async () => {
    const before = legacySnapshot(runtime.db!);

    const checkInResponse = await call(checkIn, '/api/gamification/check-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'bem' }),
    });
    expect(checkInResponse.status).toBe(200);
    await expect(checkInResponse.json()).resolves.toMatchObject({
      alreadyDone: false,
      wellbeing: { checkedInToday: true, checkInMood: 'bem' },
    });

    const duplicateCheckIn = await call(checkIn, '/api/gamification/check-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'muito_bem' }),
    });
    expect(duplicateCheckIn.status).toBe(429);

    const checkOutResponse = await call(checkOut, '/api/wellbeing/check-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'cansada' }),
    });
    expect(checkOutResponse.status).toBe(200);
    await expect(checkOutResponse.json()).resolves.toMatchObject({
      checkedInToday: true,
      checkedOutToday: true,
      checkInMood: 'bem',
      checkOutMood: 'cansada',
      alreadyDone: false,
    });

    const duplicateCheckOut = await call(checkOut, '/api/wellbeing/check-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'sobrecarregada' }),
    });
    expect(duplicateCheckOut.status).toBe(429);

    expect(runtime.db!.prepare('SELECT event_type, mood FROM wellbeing_events ORDER BY event_type').all()).toEqual([
      { event_type: 'check_in', mood: 'bem' },
      { event_type: 'check_out', mood: 'cansada' },
    ]);
    expect(legacySnapshot(runtime.db!)).toEqual(before);
  });

  it('returns daily status for collaborator UI without exposing scores or ranking fields', async () => {
    await call(checkIn, '/api/gamification/check-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'neutra' }),
    });

    const statusResponse = await call(getDailyStatus, '/api/wellbeing/daily-status');
    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      checkedInToday: true,
      checkedOutToday: false,
      checkInMood: 'neutra',
      checkOutMood: null,
      moods: WELLBEING_MOODS,
    });

    const streakResponse = await call(getStreakStatus, '/api/gamification/streak-status');
    const streakPayload = await streakResponse.json();
    expect(streakPayload).toMatchObject({
      checkedInToday: true,
      checkedOutToday: false,
      checkInMood: 'neutra',
    });
    expect(JSON.stringify(streakPayload)).not.toMatch(/points|level|ranking|health_scores|semaforo/i);
  });

  it('exports wellbeing events in DSAR for the data subject only', async () => {
    await call(checkIn, '/api/gamification/check-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'bem' }),
    });
    await call(checkOut, '/api/wellbeing/check-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mood: 'cansada' }),
    });

    const payload = JSON.parse([...createDsarExportJsonChunks(runtime.db!, 'user-1', '2026-07-23T22:00:00.000Z')].join('')) as {
      wellbeingEvents: Array<{ event_type: string; mood: string; user_id?: string }>;
    };

    expect(payload.wellbeingEvents).toHaveLength(2);
    expect(payload.wellbeingEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_type: 'check_out', mood: 'cansada' }),
      expect.objectContaining({ event_type: 'check_in', mood: 'bem' }),
    ]));
    expect(payload.wellbeingEvents.every((event) => event.user_id === undefined)).toBe(true);
  });
});
