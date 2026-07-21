import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import {
  COMMUNITY_TOPICS,
  type CommunityFeedItem,
  type CommunityFeedResponse,
  type CommunityPostStatus,
  type CommunityTopic,
} from '@/types/community';

const databases: Database.Database[] = [];
const migrationName = '054_company_community_feed.sql';
const migrationPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'db',
  'migrations',
  migrationName,
);

type SchemaRow = { name: string; sql: string };

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY);
    CREATE TABLE company_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, setting_key)
    );
    CREATE TABLE gamification_config (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, score INTEGER NOT NULL);

    INSERT INTO companies (id) VALUES ('company-default'), ('company-enabled');
    INSERT INTO users (id) VALUES ('author-1'), ('member-1');
    INSERT INTO company_settings (id, company_id, setting_key, setting_value)
    VALUES ('existing-feed-setting', 'company-enabled', 'feed_company_enabled', '1');
    INSERT INTO gamification_config (id, enabled) VALUES ('gamification-canary', 1);
    INSERT INTO health_scores (id, score) VALUES ('health-canary', 87);
  `);
  return db;
}

function legacySchema(db: Database.Database): SchemaRow[] {
  return db.prepare(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table' AND (name LIKE 'gamification%' OR name LIKE 'health%')
    ORDER BY name
  `).all() as SchemaRow[];
}

function insertPost(db: Database.Database, id = 'post-1'): void {
  db.prepare(`
    INSERT INTO community_posts (
      id, company_id, title, summary, body_text, topic, status,
      published_at, created_by, updated_by
    ) VALUES (?, 'company-default', 'Pausas conscientes', 'Resumo', 'Conteudo', 'pausas',
      'published', '2026-07-21T12:00:00.000Z', 'author-1', 'author-1')
  `).run(id);
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('migration 054 company community feed', () => {
  it('exports the shared company feed contract', () => {
    expect(COMMUNITY_TOPICS).toEqual(['pausas', 'sono', 'movimento', 'cuidado', 'geral']);

    const topic: CommunityTopic = 'pausas';
    const status: CommunityPostStatus = 'published';
    const item: CommunityFeedItem = {
      id: 'post-1',
      title: 'Pausas conscientes',
      summary: 'Resumo',
      bodyText: 'Conteudo',
      topic,
      readTimeMinutes: 5,
      imagePath: null,
      publishedAt: '2026-07-21T12:00:00.000Z',
      supportCount: 0,
      supportedByMe: false,
      savedByMe: false,
    };
    const response: CommunityFeedResponse = {
      items: [item],
      nextCursor: null,
      scope: 'company',
      settings: { companyFeedEnabled: false },
    };

    expect(status).toBe('published');
    expect(response.items).toEqual([item]);
  });

  it('applies once, creates the schema and seeds only missing company settings', () => {
    const db = createDatabase();
    const beforeLegacySchema = legacySchema(db);
    const beforeGamification = db.prepare('SELECT * FROM gamification_config').all();
    const beforeHealth = db.prepare('SELECT * FROM health_scores').all();
    const sql = fs.readFileSync(migrationPath, 'utf8');

    expect(applyMigration(db, migrationName, sql)).toBe('applied');
    expect(applyMigration(db, migrationName, sql)).toBe('skipped');

    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name LIKE 'community_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;
    expect(tables.map(({ name }) => name)).toEqual([
      'community_post_saves',
      'community_post_supports',
      'community_posts',
    ]);

    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name LIKE 'idx_community_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;
    expect(indexes.map(({ name }) => name)).toEqual([
      'idx_community_posts_company_status',
      'idx_community_posts_company_topic',
      'idx_community_saves_user',
      'idx_community_supports_post',
    ]);

    const settings = db.prepare(`
      SELECT company_id, setting_value FROM company_settings
      WHERE setting_key = 'feed_company_enabled'
      ORDER BY company_id
    `).all();
    expect(settings).toEqual([
      { company_id: 'company-default', setting_value: '0' },
      { company_id: 'company-enabled', setting_value: '1' },
    ]);

    expect(legacySchema(db)).toEqual(beforeLegacySchema);
    expect(db.prepare('SELECT * FROM gamification_config').all()).toEqual(beforeGamification);
    expect(db.prepare('SELECT * FROM health_scores').all()).toEqual(beforeHealth);
  });

  it('enforces status and unique support/save pairs', () => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
    insertPost(db);

    expect(() => db.prepare(`
      INSERT INTO community_posts (
        id, company_id, title, summary, body_text, topic, status, created_by, updated_by
      ) VALUES (
        'invalid-post', 'company-default', 'Titulo', 'Resumo', 'Conteudo', 'geral',
        'invalid', 'author-1', 'author-1'
      )
    `).run()).toThrow();

    db.prepare(`
      INSERT INTO community_post_supports (post_id, user_id) VALUES ('post-1', 'member-1')
    `).run();
    expect(() => db.prepare(`
      INSERT INTO community_post_supports (post_id, user_id) VALUES ('post-1', 'member-1')
    `).run()).toThrow();

    db.prepare(`
      INSERT INTO community_post_saves (post_id, user_id) VALUES ('post-1', 'member-1')
    `).run();
    expect(() => db.prepare(`
      INSERT INTO community_post_saves (post_id, user_id) VALUES ('post-1', 'member-1')
    `).run()).toThrow();
  });

  it('cascades supports and saves when a post is deleted', () => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
    insertPost(db);
    db.exec(`
      INSERT INTO community_post_supports (post_id, user_id) VALUES ('post-1', 'member-1');
      INSERT INTO community_post_saves (post_id, user_id) VALUES ('post-1', 'member-1');
      DELETE FROM community_posts WHERE id = 'post-1';
    `);

    expect(db.prepare('SELECT * FROM community_post_supports').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM community_post_saves').all()).toEqual([]);
  });
});
