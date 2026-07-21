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
type PostFixture = {
  id: string;
  company_id: string;
  title: string;
  summary: string;
  body_text: string;
  topic: string;
  read_time_minutes: number;
  status: string;
  published_at: string | null;
  created_by: string;
  updated_by: string;
};

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
    INSERT INTO company_settings (id, company_id, setting_key, setting_value) VALUES
      ('existing-feed-setting', 'company-enabled', 'feed_company_enabled', '1'),
      ('community-feed-company-enabled-company-default', 'company-enabled', 'unrelated_setting', 'keep-me');
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

function indexColumns(
  db: Database.Database,
  indexName: string,
): Array<{ name: string; desc: number }> {
  const rows = db.prepare(`PRAGMA index_xinfo('${indexName}')`).all() as Array<{
    name: string | null;
    desc: number;
    key: number;
  }>;
  return rows
    .filter((row): row is { name: string; desc: number; key: number } => row.key === 1 && row.name !== null)
    .map(({ name, desc }) => ({ name, desc }));
}

function insertPost(
  db: Database.Database,
  overrides: Partial<PostFixture> = {},
): void {
  const post: PostFixture = {
    id: 'post-1',
    company_id: 'company-default',
    title: 'Pausas conscientes',
    summary: 'Uma pausa breve para recuperar o foco.',
    body_text: 'Conteudo editorial com orientacoes praticas.',
    topic: 'pausas',
    read_time_minutes: 5,
    status: 'published',
    published_at: '2026-07-21T12:00:00.000Z',
    created_by: 'author-1',
    updated_by: 'author-1',
    ...overrides,
  };
  db.prepare(`
    INSERT INTO community_posts (
      id, company_id, title, summary, body_text, topic, read_time_minutes, status,
      published_at, created_by, updated_by
    ) VALUES (
      @id, @company_id, @title, @summary, @body_text, @topic, @read_time_minutes, @status,
      @published_at, @created_by, @updated_by
    )
  `).run(post);
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
    expect(indexColumns(db, 'idx_community_posts_company_status')).toEqual([
      { name: 'company_id', desc: 0 },
      { name: 'status', desc: 0 },
      { name: 'published_at', desc: 1 },
      { name: 'created_at', desc: 1 },
      { name: 'id', desc: 1 },
    ]);
    expect(indexColumns(db, 'idx_community_posts_company_topic')).toEqual([
      { name: 'company_id', desc: 0 },
      { name: 'topic', desc: 0 },
      { name: 'status', desc: 0 },
      { name: 'published_at', desc: 1 },
      { name: 'created_at', desc: 1 },
      { name: 'id', desc: 1 },
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
    expect(db.prepare(`
      SELECT id, setting_value FROM company_settings
      WHERE company_id = 'company-default' AND setting_key = 'feed_company_enabled'
    `).get()).toEqual({
      id: expect.stringMatching(/^[0-9a-f]{32}$/),
      setting_value: '0',
    });
    expect(db.prepare(`
      SELECT company_id, setting_key, setting_value FROM company_settings
      WHERE id = 'community-feed-company-enabled-company-default'
    `).get()).toEqual({
      company_id: 'company-enabled',
      setting_key: 'unrelated_setting',
      setting_value: 'keep-me',
    });

    expect(legacySchema(db)).toEqual(beforeLegacySchema);
    expect(db.prepare('SELECT * FROM gamification_config').all()).toEqual(beforeGamification);
    expect(db.prepare('SELECT * FROM health_scores').all()).toEqual(beforeHealth);
  });

  it('enforces status and unique support/save pairs', () => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
    insertPost(db);

    expect(() => insertPost(db, { id: 'invalid-post', status: 'invalid' })).toThrow();

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

  it('restricts physical deletion of a referenced author', () => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
    insertPost(db);

    const authorForeignKeys = (db.prepare(`PRAGMA foreign_key_list('community_posts')`).all() as Array<{
      from: string;
      table: string;
      on_delete: string;
    }>)
      .filter((row) => row.from === 'created_by' || row.from === 'updated_by')
      .map(({ from, table, on_delete }) => ({ from, table, on_delete }))
      .sort((left, right) => left.from.localeCompare(right.from));
    expect(authorForeignKeys).toEqual([
      { from: 'created_by', table: 'users', on_delete: 'RESTRICT' },
      { from: 'updated_by', table: 'users', on_delete: 'RESTRICT' },
    ]);
    expect(() => db.prepare("DELETE FROM users WHERE id = 'author-1'").run()).toThrow();
    expect(db.prepare("SELECT id FROM users WHERE id = 'author-1'").get()).toEqual({ id: 'author-1' });
  });

  it('cascades posts, supports and saves when a company is deleted', () => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
    insertPost(db);
    db.exec(`
      INSERT INTO community_post_supports (post_id, user_id) VALUES ('post-1', 'member-1');
      INSERT INTO community_post_saves (post_id, user_id) VALUES ('post-1', 'member-1');
      DELETE FROM companies WHERE id = 'company-default';
    `);

    expect(db.prepare('SELECT * FROM community_posts').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM community_post_supports').all()).toEqual([]);
    expect(db.prepare('SELECT * FROM community_post_saves').all()).toEqual([]);
  });

  it.each<Array<[string, Partial<PostFixture>]>>([
    ['an unknown topic', { topic: 'unknown' }],
    ['a read time below 1', { read_time_minutes: 0 }],
    ['a read time above 60', { read_time_minutes: 61 }],
    ['a trimmed title shorter than 3 characters', { title: '  ok  ' }],
    ['a trimmed title longer than 120 characters', { title: `  ${'x'.repeat(121)}  ` }],
    ['a trimmed summary shorter than 10 characters', { summary: '  123456789  ' }],
    ['a trimmed summary longer than 240 characters', { summary: `  ${'x'.repeat(241)}  ` }],
    ['a body shorter than 20 characters', { body_text: 'x'.repeat(19) }],
    ['a body longer than 8000 characters', { body_text: 'x'.repeat(8001) }],
    ['a published post without published_at', { status: 'published', published_at: null }],
  ])('rejects %s', (_case, overrides) => {
    const db = createDatabase();
    applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));

    expect(() => insertPost(db, overrides)).toThrow();
  });
});
