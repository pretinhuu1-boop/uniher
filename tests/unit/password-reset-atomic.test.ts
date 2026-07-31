import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  db: undefined as unknown as Database.Database,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => operation(deps.db),
  }),
}));

import {
  beginAdministrativePasswordReset,
  consumeResetTokenAndUpdatePassword,
} from '@/repositories/password-reset.repository';

describe('atomic password reset lifecycle', () => {
  beforeEach(() => {
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        role TEXT NOT NULL DEFAULT 'colaboradora',
        email TEXT NOT NULL,
        approved INTEGER,
        blocked INTEGER,
        is_master_admin INTEGER DEFAULT 0,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        password_reset_required INTEGER NOT NULL DEFAULT 0,
        session_version INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL
      );
      INSERT INTO companies (id, is_active) VALUES ('company-a', 1);
      INSERT INTO companies (id, is_active) VALUES ('company-b', 1);
      INSERT INTO users (
        id, company_id, role, email, approved, blocked, password_hash
      ) VALUES (
        'user-1', 'company-a', 'colaboradora', 'user@example.com', 1, 0,
        'old-password-hash'
      );
      INSERT INTO users (
        id, company_id, role, email, approved, blocked, password_hash
      ) VALUES (
        'rh-1', 'company-a', 'rh', 'rh@example.com', 1, 0, 'rh-hash'
      );
      INSERT INTO users (
        id, role, email, approved, blocked, is_master_admin, password_hash
      ) VALUES (
        'admin-1', 'admin', 'admin@example.com', 1, 0, 1, 'admin-hash'
      );
      INSERT INTO refresh_tokens (id, user_id) VALUES ('refresh-1', 'user-1');
    `);
  });

  it('does not reset a user moved outside the RH company boundary', async () => {
    deps.db.prepare(
      "UPDATE users SET company_id = 'company-b' WHERE id = 'user-1'",
    ).run();

    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedCompanyId: 'company-a',
      expectedActorId: 'rh-1',
      expectedActorRole: 'rh',
      token: 'cross-tenant-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'attacker-hash',
    })).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'old-password-hash',
      session_version: 0,
    });
    expect(deps.db.prepare(
      'SELECT COUNT(*) AS count FROM password_reset_tokens',
    ).get()).toEqual({ count: 0 });
  });

  it('does not reset a user promoted to a protected role', async () => {
    deps.db.prepare(
      "UPDATE users SET role = 'rh' WHERE id = 'user-1'",
    ).run();

    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedCompanyId: 'company-a',
      expectedActorId: 'rh-1',
      expectedActorRole: 'rh',
      token: 'protected-role-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'attacker-hash',
    })).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'old-password-hash',
      session_version: 0,
    });
    expect(deps.db.prepare(
      'SELECT COUNT(*) AS count FROM password_reset_tokens',
    ).get()).toEqual({ count: 0 });
  });

  it('does not reset after the RH actor is revoked', async () => {
    deps.db.prepare(
      "UPDATE users SET blocked = 1 WHERE id = 'rh-1'",
    ).run();

    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedCompanyId: 'company-a',
      expectedActorId: 'rh-1',
      expectedActorRole: 'rh',
      token: 'revoked-actor-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'attacker-hash',
    })).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'old-password-hash',
      session_version: 0,
    });
    expect(deps.db.prepare(
      'SELECT COUNT(*) AS count FROM password_reset_tokens',
    ).get()).toEqual({ count: 0 });
  });

  it('does not activate a reset token sent to a stale email', async () => {
    deps.db.prepare(
      "UPDATE users SET email = 'changed@example.com' WHERE id = 'user-1'",
    ).run();

    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedCompanyId: 'company-a',
      expectedActorId: 'rh-1',
      expectedActorRole: 'rh',
      token: 'stale-email-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'attacker-hash',
    })).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'old-password-hash',
      session_version: 0,
    });
    expect(deps.db.prepare(
      'SELECT COUNT(*) AS count FROM password_reset_tokens',
    ).get()).toEqual({ count: 0 });
  });

  it('does not reset after the Master Admin actor is revoked', async () => {
    deps.db.prepare(
      "UPDATE users SET is_master_admin = 0 WHERE id = 'admin-1'",
    ).run();

    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedActorId: 'admin-1',
      expectedActorRole: 'admin',
      token: 'revoked-admin-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'attacker-hash',
    })).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'old-password-hash',
      session_version: 0,
    });
    expect(deps.db.prepare(
      'SELECT COUNT(*) AS count FROM password_reset_tokens',
    ).get()).toEqual({ count: 0 });
  });

  it('atomically invalidates the old password and all sessions for an administrative reset', async () => {
    await expect(beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedActorId: 'admin-1',
      expectedActorRole: 'admin',
      token: 'reset-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'unusable-random-hash',
    })).resolves.toBe(true);

    expect(deps.db.prepare(`
      SELECT password_hash, must_change_password, password_reset_required, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'unusable-random-hash',
      must_change_password: 1,
      password_reset_required: 1,
      session_version: 1,
    });
    expect(deps.db.prepare(
      "SELECT COUNT(*) AS count FROM refresh_tokens WHERE user_id = 'user-1'",
    ).get()).toEqual({ count: 0 });
  });

  it('consumes a reset token once and clears both reset flags with the password update', async () => {
    await beginAdministrativePasswordReset({
      userId: 'user-1',
      expectedEmail: 'user@example.com',
      expectedActorId: 'admin-1',
      expectedActorRole: 'admin',
      token: 'single-use-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
      replacementPasswordHash: 'unusable-random-hash',
    });

    await expect(consumeResetTokenAndUpdatePassword(
      'single-use-token',
      'new-password-hash',
    )).resolves.toBe(true);
    await expect(consumeResetTokenAndUpdatePassword(
      'single-use-token',
      'attacker-password-hash',
    )).resolves.toBe(false);

    expect(deps.db.prepare(`
      SELECT password_hash, must_change_password, password_reset_required, session_version
      FROM users WHERE id = 'user-1'
    `).get()).toEqual({
      password_hash: 'new-password-hash',
      must_change_password: 0,
      password_reset_required: 0,
      session_version: 2,
    });
  });
});
