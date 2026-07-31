import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

describe('security session migration', () => {
  it('deduplicates legacy refresh hashes before enforcing uniqueness', () => {
    const db = new Database(':memory:');
    try {
      db.exec(`
        CREATE TABLE users (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE refresh_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        INSERT INTO users (id) VALUES ('user-1');
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES
          ('old-1', 'user-1', 'duplicate-hash', datetime('now', '+1 day')),
          ('old-2', 'user-1', 'duplicate-hash', datetime('now', '+2 days'));
      `);

      const migrationPath = path.join(
        process.cwd(),
        'src',
        'lib',
        'db',
        'migrations',
        '070_security_session_version.sql',
      );
      expect(applyMigration(
        db,
        '070_security_session_version.sql',
        readFileSync(migrationPath, 'utf8'),
      )).toBe('applied');

      expect(db.prepare(`
        SELECT COUNT(*) AS count
        FROM refresh_tokens
        WHERE token_hash = 'duplicate-hash'
      `).get()).toEqual({ count: 1 });
      expect(db.prepare(
        "SELECT session_version FROM users WHERE id = 'user-1'",
      ).get()).toEqual({ session_version: 0 });
      expect(() => db.prepare(`
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES ('new', 'user-1', 'duplicate-hash', datetime('now', '+1 day'))
      `).run()).toThrow(/UNIQUE/);
    } finally {
      db.close();
    }
  });
});
