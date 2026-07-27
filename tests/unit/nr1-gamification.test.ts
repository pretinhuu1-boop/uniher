import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const databaseBoundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  gatewayAccesses: [] as string[],
}));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: (...args: any[]) => unknown) => handler,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkWriteRateLimit: async () => undefined,
}));

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    databaseBoundary.gatewayAccesses.push('getReadDb');
    return databaseBoundary.db;
  },
  getWriteQueue: () => {
    databaseBoundary.gatewayAccesses.push('getWriteQueue');
    return {
      enqueue: async (operation: (db: Database.Database) => unknown) => {
        if (!databaseBoundary.db) throw new Error('Test database is not configured');
        return operation(databaseBoundary.db);
      },
    };
  },
}));

import { PUT as submitCopsoq } from '@/app/api/yavix/copsoq/submit/route';
import { saveAnswer } from '@/lib/yavix/copsoq.mock';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const protectedTables = ['users', 'activity_log', 'user_badges', 'notifications'] as const;

function createSentinelDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, points INTEGER NOT NULL);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL);
    CREATE TABLE user_badges (user_id TEXT NOT NULL, badge_id TEXT NOT NULL);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, message TEXT NOT NULL);
    CREATE TABLE company_modules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      module_state TEXT NOT NULL,
      visible INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );
    CREATE TABLE user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 1,
      ip_address TEXT,
      user_agent TEXT,
      granted_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    INSERT INTO users VALUES ('nr1-user', 37);
    INSERT INTO activity_log VALUES ('activity-before', 'nr1-user', 'existing_activity');
    INSERT INTO user_badges VALUES ('nr1-user', 'existing-badge');
    INSERT INTO notifications VALUES ('notification-before', 'nr1-user', 'existing notification');
    INSERT INTO company_modules (
      id, company_id, module_slug, module_state, visible, notes, created_at, updated_at, updated_by
    ) VALUES (
      'company-1-nr1', 'company-1', 'nr1', 'enabled', 1, null,
      '2026-07-23T22:00:00.000Z', '2026-07-23T22:00:00.000Z', null
    );
  `);
  return db;
}

function snapshotProtectedTables(): Record<string, unknown[]> {
  if (!databaseBoundary.db) throw new Error('Test database is not configured');
  return Object.fromEntries(
    protectedTables.map((table) => [
      table,
      databaseBoundary.db!.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
    ]),
  );
}

async function putCopsoq(userId: string): Promise<Response> {
  const handler = submitCopsoq as unknown as (
    request: NextRequest,
    context: {
      auth: { userId: string; companyId: string; role: string };
      params: Promise<Record<string, string>>;
    },
  ) => Promise<Response>;

  return handler(
    new Request('http://localhost/api/yavix/copsoq/submit', { method: 'PUT' }) as unknown as NextRequest,
    {
      auth: { userId, companyId: 'company-1', role: 'colaboradora' },
      params: Promise.resolve({}),
    },
  );
}

beforeEach(() => {
  vi.stubEnv('YAVIX_MOCK', '1');
  databaseBoundary.db = createSentinelDatabase();
  databaseBoundary.gatewayAccesses = [];
});

afterEach(() => {
  databaseBoundary.db?.close();
  databaseBoundary.db = null;
  vi.unstubAllEnvs();
});

describe('NR-1 gamification containment', () => {
  it('submits incomplete, complete and retry flows without touching legacy gamification tables', async () => {
    const userId = `nr1-route-${Date.now()}-${Math.random()}`;
    databaseBoundary.db!.prepare(
      'INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(`consent-${userId}`, userId, 'nr1_psychosocial', 1, '127.0.0.1', 'vitest');
    const before = snapshotProtectedTables();

    const incomplete = await putCopsoq(userId);
    expect(incomplete.status).toBe(422);
    expect(await incomplete.json()).toEqual({
      error: 'INCOMPLETE',
      missing: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    });
    expect(snapshotProtectedTables()).toEqual(before);

    for (let code = 2; code <= 12; code += 1) {
      expect(saveAnswer(userId, code, '5')).toEqual({ ok: true });
    }

    const complete = await putCopsoq(userId);
    expect(complete.status).toBe(200);
    expect(await complete.json()).toEqual({ status: 'DONE' });
    expect(snapshotProtectedTables()).toEqual(before);

    const retry = await putCopsoq(userId);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ status: 'DONE' });
    expect(snapshotProtectedTables()).toEqual(before);
    expect(databaseBoundary.gatewayAccesses).toEqual([
      'getReadDb',
      'getReadDb',
      'getReadDb',
      'getReadDb',
      'getReadDb',
      'getReadDb',
    ]);
  });

  it('keeps COPSOQ completion disconnected from legacy gamification writes', () => {
    const route = read('src/app/api/yavix/copsoq/submit/route.ts');
    const service = read('src/services/gamification.service.ts');

    expect(route).not.toMatch(/awardNr1Completion|gamification\.service|xpEarned|alreadyAwarded/);
    expect(service).not.toMatch(/awardNr1Completion|checkParticipationBadges|earn_points_nr1_completed|nr1_assessment/);
  });

  it('returns a neutral completion contract and renders no reward celebration', () => {
    const types = read('src/lib/yavix/copsoq.types.ts');
    const hook = read('src/hooks/useCopsoq.ts');
    const flow = read('src/components/copsoq/CopsoqFlow.tsx');

    expect(types).not.toMatch(/xpEarned|alreadyAwarded/);
    expect(hook).not.toMatch(/xpEarned|alreadyAwarded|reward:/);
    expect(flow).not.toMatch(/XP por participar|xpEarned|alreadyAwarded/);
  });
});
