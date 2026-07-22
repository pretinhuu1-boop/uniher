import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

import { cleanupCommunityData, closeTeardownDatabase } from '../global-teardown';

function database(includeSettings = true): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id));
    CREATE TABLE community_posts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      updated_by TEXT NOT NULL REFERENCES users(id)
    );
    CREATE TABLE community_post_supports (
      post_id TEXT NOT NULL REFERENCES community_posts(id),
      user_id TEXT NOT NULL REFERENCES users(id)
    );
    CREATE TABLE community_post_saves (
      post_id TEXT NOT NULL REFERENCES community_posts(id),
      user_id TEXT NOT NULL REFERENCES users(id)
    );
    ${includeSettings ? 'CREATE TABLE company_settings (company_id TEXT NOT NULL REFERENCES companies(id));' : ''}
    INSERT INTO companies (id) VALUES ('company-a');
    INSERT INTO users (id, company_id) VALUES ('user-a', 'company-a');
    INSERT INTO community_posts (id, company_id, created_by, updated_by)
    VALUES ('post-a', 'company-a', 'user-a', 'user-a');
    INSERT INTO community_post_supports (post_id, user_id) VALUES ('post-a', 'user-a');
    INSERT INTO community_post_saves (post_id, user_id) VALUES ('post-a', 'user-a');
    ${includeSettings ? "INSERT INTO company_settings (company_id) VALUES ('company-a');" : ''}
  `);
  return db;
}

describe('community teardown transaction', () => {
  it('closes the database even when final pragma restoration fails', () => {
    let closed = false;
    const db = {
      pragma() {
        throw new Error('pragma restore failed');
      },
      close() {
        closed = true;
      },
    } as unknown as Database.Database;

    expect(() => closeTeardownDatabase(db, 1)).toThrow('pragma restore failed');
    expect(closed).toBe(true);
  });

  it('deletes relations, posts, and settings in FK-safe order with foreign keys enabled', () => {
    const db = database();
    try {
      cleanupCommunityData(db, ['company-a'], ['user-a']);

      expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
      for (const table of [
        'community_post_supports',
        'community_post_saves',
        'community_posts',
        'company_settings',
      ]) {
        expect(db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get()).toBe(0);
      }
    } finally {
      db.close();
    }
  });

  it('rolls back prior deletes and propagates a required-table failure', () => {
    const db = database(false);
    try {
      expect(() => cleanupCommunityData(db, ['company-a'], ['user-a']))
        .toThrow(/company_settings/);
      expect(db.prepare('SELECT COUNT(*) FROM community_posts').pluck().get()).toBe(1);
      expect(db.prepare('SELECT COUNT(*) FROM community_post_supports').pluck().get()).toBe(1);
      expect(db.prepare('SELECT COUNT(*) FROM community_post_saves').pluck().get()).toBe(1);
    } finally {
      db.close();
    }
  });
});
