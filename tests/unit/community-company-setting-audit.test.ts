import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContext } from '@/lib/auth/middleware';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  transactionModes: [] as string[],
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => boundary.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!boundary.db) throw new Error('Test database is not configured');
      const guardedDb = new Proxy(boundary.db, {
        get(target, property) {
          if (property === 'transaction') {
            return (callback: () => unknown) => {
              const transaction = target.transaction(callback);
              const guardedTransaction = () => {
                boundary.transactionModes.push('deferred');
                throw new Error('Deferred transaction is forbidden for feed setting writes');
              };
              guardedTransaction.immediate = () => {
                boundary.transactionModes.push('immediate');
                return transaction.immediate();
              };
              return guardedTransaction;
            };
          }
          const value = Reflect.get(target, property, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as Database.Database;
      return operation(guardedDb);
    },
  }),
}));
vi.mock('@/lib/security/rate-limit', () => ({
  checkWriteRateLimit: async () => undefined,
}));
vi.mock('@/lib/gamification/containment', () => ({
  toSafeUserProjection: <T>(value: T) => value,
}));

import { PATCH as patchCompany } from '@/app/api/company/route';

const COMPANY_ID = 'company-a';
const ACTOR_ID = 'rh-a';
const ACTOR_EMAIL = 'rh-a@example.test';
const REQUEST_IP = '198.51.100.77';

const context: AuthContext = {
  auth: { userId: ACTOR_ID, companyId: COMPANY_ID, role: 'rh' },
  params: Promise.resolve({}),
};

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 1,
      blocked INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE company_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(company_id, setting_key)
    );
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      entity_label TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO companies (id) VALUES ('company-a');
    INSERT INTO users (id, company_id, email, role)
    VALUES ('rh-a', 'company-a', 'rh-a@example.test', 'rh');
  `);
  return db;
}

async function setFeedEnabled(enabled: boolean): Promise<Response> {
  return patchCompany(
    new Request('http://localhost/api/company', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `${REQUEST_IP}, 10.0.0.7`,
      },
      body: JSON.stringify({ feedCompanyEnabled: enabled }),
    }) as unknown as NextRequest,
    context,
  );
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.transactionModes = [];
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('company community feed setting audit', () => {
  it('runs the complete company write in an IMMEDIATE transaction', async () => {
    const response = await setFeedEnabled(true);

    expect(boundary.transactionModes).toEqual(['immediate']);
    expect(response.status).toBe(200);
  });

  it('records one complete receipt only when the effective setting changes', async () => {
    expect((await setFeedEnabled(true)).status).toBe(200);
    const firstUpdatedAt = boundary.db!.prepare(`
      SELECT updated_at FROM company_settings
      WHERE company_id = ? AND setting_key = 'feed_company_enabled'
    `).pluck().get(COMPANY_ID);

    expect((await setFeedEnabled(true)).status).toBe(200);

    const setting = boundary.db!.prepare(`
      SELECT setting_value, updated_at FROM company_settings
      WHERE company_id = ? AND setting_key = 'feed_company_enabled'
    `).get(COMPANY_ID);
    expect(setting).toEqual({ setting_value: '1', updated_at: firstUpdatedAt });

    const receipts = boundary.db!.prepare(`
      SELECT actor_id, actor_email, actor_role, action, entity_type, entity_id,
             details, ip, created_at
      FROM audit_logs
      WHERE action = 'company_community_feed_setting_update'
    `).all() as Array<Record<string, string>>;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      actor_id: ACTOR_ID,
      actor_email: ACTOR_EMAIL,
      actor_role: 'rh',
      action: 'company_community_feed_setting_update',
      entity_type: 'company_setting',
      entity_id: COMPANY_ID,
      ip: REQUEST_IP,
    });
    expect(receipts[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(JSON.parse(receipts[0].details)).toEqual({
      companyId: COMPANY_ID,
      previous: false,
      new: true,
      timestamp: receipts[0].created_at,
    });
    expect(receipts[0].details).not.toMatch(/body|content|summary|title/i);
  });

  it('rolls the setting change back when its receipt cannot be inserted', async () => {
    boundary.db!.exec(`
      CREATE TRIGGER reject_feed_setting_audit
      BEFORE INSERT ON audit_logs
      WHEN NEW.action = 'company_community_feed_setting_update'
      BEGIN
        SELECT RAISE(ABORT, 'receipt rejected');
      END;
    `);

    expect((await setFeedEnabled(true)).status).toBe(500);
    expect(boundary.db!.prepare(`
      SELECT COUNT(*) FROM company_settings
      WHERE company_id = ? AND setting_key = 'feed_company_enabled'
    `).pluck().get(COMPANY_ID)).toBe(0);
  });
});
