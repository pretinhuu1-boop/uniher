import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { createCommunityRepository } from '@/repositories/community.repository';
import {
  addCommunityPostSupport,
  getCommunityFeed,
  getCommunitySupporters,
  getSavedCommunityPosts,
  removeCommunityPostSupport,
  saveCommunityPost,
  unsaveCommunityPost,
} from '@/services/community.service';

const databases: Database.Database[] = [];
const NOW = '2026-07-21T12:00:00.000Z';
const actorA = { userId: 'actor-a', companyId: 'company-a' };
const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '054_company_community_feed.sql');

type PostInput = {
  id: string;
  companyId?: string;
  topic?: string;
  status?: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
};

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id),
      name TEXT NOT NULL,
      nickname TEXT,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      department_id TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE company_settings (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, setting_key)
    );
    CREATE TABLE user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, pref_key)
    );

    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id, company_id, name, nickname, email, role) VALUES
      ('actor-a', 'company-a', 'Ana A', NULL, 'actor-a@example.test', 'colaboradora'),
      ('member-a', 'company-a', 'Maria A', NULL, 'member-a@example.test', 'colaboradora'),
      ('member-b', 'company-b', 'Bruna B', NULL, 'member-b@example.test', 'colaboradora'),
      ('author-a', 'company-a', 'Autora A', NULL, 'author-a@example.test', 'rh'),
      ('author-b', 'company-b', 'Autora B', NULL, 'author-b@example.test', 'rh');
  `);
  applyMigration(db, '054_company_community_feed.sql', fs.readFileSync(migrationPath, 'utf8'));
  db.exec(`
    UPDATE company_settings SET setting_value = '1'
    WHERE setting_key = 'feed_company_enabled';
  `);
  return db;
}

function insertPost(db: Database.Database, input: PostInput): void {
  const post = {
    companyId: 'company-a',
    topic: 'pausas',
    status: 'published',
    publishedAt: '2026-07-20T10:00:00.000Z',
    expiresAt: null,
    createdAt: '2026-07-20T09:00:00.000Z',
    deletedAt: null,
    ...input,
  };
  const author = post.companyId === 'company-a' ? 'author-a' : 'author-b';
  db.prepare(`
    INSERT INTO community_posts (
      id, company_id, title, summary, body_text, topic, read_time_minutes, image_path,
      status, published_at, expires_at, created_by, updated_by, created_at, updated_at, deleted_at
    ) VALUES (
      @id, @companyId, @id || ' title', @id || ' summary long', @id || ' body content sufficiently long',
      @topic, 5, NULL, @status, @publishedAt, @expiresAt, @author, @author, @createdAt, @createdAt, @deletedAt
    )
  `).run({ ...post, author });
}

function repo(db: Database.Database) {
  return createCommunityRepository(db);
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('community feed repository behavior', () => {
  it('never exposes another company sentinel', () => {
    const db = createDatabase();
    insertPost(db, { id: 'visible-a' });
    insertPost(db, { id: 'company-b-sentinel', companyId: 'company-b' });

    const response = getCommunityFeed(actorA, repo(db), {}, NOW);
    expect(response.items.map((item) => item.id)).toEqual(['visible-a']);
    expect(JSON.stringify(response)).not.toContain('company-b-sentinel');
  });

  it('excludes draft, future, expired, archived and deleted posts', () => {
    const db = createDatabase();
    insertPost(db, { id: 'visible' });
    insertPost(db, { id: 'draft', status: 'draft', publishedAt: null });
    insertPost(db, { id: 'future', publishedAt: '2026-07-22T00:00:00.000Z' });
    insertPost(db, { id: 'expired', expiresAt: NOW });
    insertPost(db, { id: 'archived', status: 'archived' });
    insertPost(db, { id: 'deleted', deletedAt: '2026-07-21T08:00:00.000Z' });

    expect(getCommunityFeed(actorA, repo(db), {}, NOW).items.map((item) => item.id)).toEqual(['visible']);
  });

  it('uses stable tuple keyset pagination across tied timestamps', () => {
    const db = createDatabase();
    for (const id of ['post-1', 'post-2', 'post-3', 'post-4', 'post-5']) insertPost(db, { id });
    const repository = repo(db);

    const first = getCommunityFeed(actorA, repository, { limit: 2 }, NOW);
    const second = getCommunityFeed(actorA, repository, { limit: 2, cursor: first.nextCursor! }, NOW);
    const third = getCommunityFeed(actorA, repository, { limit: 2, cursor: second.nextCursor! }, NOW);

    expect(first.items.map((item) => item.id)).toEqual(['post-5', 'post-4']);
    expect(second.items.map((item) => item.id)).toEqual(['post-3', 'post-2']);
    expect(third.items.map((item) => item.id)).toEqual(['post-1']);
    expect(new Set([...first.items, ...second.items, ...third.items].map((item) => item.id)).size).toBe(5);
    expect(third.nextCursor).toBeNull();
  });

  it('filters by an allowed topic', () => {
    const db = createDatabase();
    insertPost(db, { id: 'pause', topic: 'pausas' });
    insertPost(db, { id: 'sleep', topic: 'sono' });
    expect(getCommunityFeed(actorA, repo(db), { topic: 'sono' }, NOW).items.map((item) => item.id)).toEqual(['sleep']);
  });
});

describe('community support and save repository behavior', () => {
  it('adds and removes support idempotently while returning the count', () => {
    const db = createDatabase();
    insertPost(db, { id: 'post-a' });
    const repository = repo(db);

    expect(addCommunityPostSupport(actorA, repository, 'post-a', NOW)).toEqual({ supportCount: 1, supportedByMe: true });
    expect(addCommunityPostSupport(actorA, repository, 'post-a', NOW)).toEqual({ supportCount: 1, supportedByMe: true });
    expect(removeCommunityPostSupport(actorA, repository, 'post-a', NOW)).toEqual({ supportCount: 0, supportedByMe: false });
    expect(removeCommunityPostSupport(actorA, repository, 'post-a', NOW)).toEqual({ supportCount: 0, supportedByMe: false });
  });

  it('adds and removes saves idempotently and lists only the current user saves', () => {
    const db = createDatabase();
    insertPost(db, { id: 'saved' });
    insertPost(db, { id: 'other-user-save' });
    db.prepare(`INSERT INTO community_post_saves (post_id, user_id) VALUES ('other-user-save', 'member-a')`).run();
    const repository = repo(db);

    expect(saveCommunityPost(actorA, repository, 'saved', NOW)).toEqual({ savedByMe: true });
    expect(saveCommunityPost(actorA, repository, 'saved', NOW)).toEqual({ savedByMe: true });
    expect(getSavedCommunityPosts(actorA, repository, {}, NOW).items.map((item) => item.id)).toEqual(['saved']);
    expect(unsaveCommunityPost(actorA, repository, 'saved', NOW)).toEqual({ savedByMe: false });
    expect(unsaveCommunityPost(actorA, repository, 'saved', NOW)).toEqual({ savedByMe: false });
    expect(getSavedCommunityPosts(actorA, repository, {}, NOW).items).toEqual([]);
  });

  it.each(['support', 'save'] as const)('uses the same not-found error for cross-company %s', (operation) => {
    const db = createDatabase();
    insertPost(db, { id: 'foreign', companyId: 'company-b' });
    const action = operation === 'support' ? addCommunityPostSupport : saveCommunityPost;
    expect(() => action(actorA, repo(db), 'foreign', NOW)).toThrowError(expect.objectContaining({
      code: 'POST_NOT_FOUND',
      statusCode: 404,
    }));
  });

  it.each(['support', 'save'] as const)('uses the same not-found error for inactive %s', (operation) => {
    const db = createDatabase();
    insertPost(db, { id: 'inactive', status: 'draft', publishedAt: null });
    const action = operation === 'support' ? addCommunityPostSupport : saveCommunityPost;
    expect(() => action(actorA, repo(db), 'inactive', NOW)).toThrowError(expect.objectContaining({
      code: 'POST_NOT_FOUND',
      statusCode: 404,
    }));
  });

  it('blocks mutations when the company feed is disabled', () => {
    const db = createDatabase();
    insertPost(db, { id: 'post-a' });
    db.prepare(`
      UPDATE company_settings SET setting_value = '0'
      WHERE company_id = 'company-a' AND setting_key = 'feed_company_enabled'
    `).run();

    expect(() => addCommunityPostSupport(actorA, repo(db), 'post-a', NOW)).toThrowError(expect.objectContaining({
      code: 'FEED_DISABLED',
      statusCode: 403,
    }));
    expect(() => saveCommunityPost(actorA, repo(db), 'post-a', NOW)).toThrowError(expect.objectContaining({
      code: 'FEED_DISABLED',
      statusCode: 403,
    }));
  });

  it('excludes expired, deleted and unpublished posts from saved results', () => {
    const db = createDatabase();
    insertPost(db, { id: 'visible' });
    insertPost(db, { id: 'expired', expiresAt: NOW });
    insertPost(db, { id: 'deleted', deletedAt: NOW });
    insertPost(db, { id: 'draft', status: 'draft', publishedAt: null });
    for (const id of ['visible', 'expired', 'deleted', 'draft']) {
      db.prepare(`INSERT INTO community_post_saves (post_id, user_id) VALUES (?, 'actor-a')`).run(id);
    }
    expect(getSavedCommunityPosts(actorA, repo(db), {}, NOW).items.map((item) => item.id)).toEqual(['visible']);
  });
});

describe('community supporter repository behavior', () => {
  it('paginates opted-in supporters stably across tied timestamps', () => {
    const db = createDatabase();
    insertPost(db, { id: 'post-a' });
    db.exec(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value) VALUES
        ('actor-a', 'privacy_community_supporter_name', '1'),
        ('member-a', 'privacy_community_supporter_name', '1');
      INSERT INTO community_post_supports (post_id, user_id, created_at) VALUES
        ('post-a', 'actor-a', '2026-07-20T08:00:00.000Z'),
        ('post-a', 'member-a', '2026-07-20T08:00:00.000Z');
    `);
    const repository = repo(db);
    const first = getCommunitySupporters(actorA, repository, 'post-a', { limit: 1 }, NOW);
    const second = getCommunitySupporters(actorA, repository, 'post-a', { limit: 1, cursor: first.nextCursor! }, NOW);

    expect(first.names).toEqual(['Maria']);
    expect(second.names).toEqual(['Ana']);
    expect(second.nextCursor).toBeNull();
  });

  it('works without legacy gamification or health tables', () => {
    const db = createDatabase();
    insertPost(db, { id: 'plain-domain' });
    const repository = repo(db);

    expect(getCommunityFeed(actorA, repository, {}, NOW).items).toHaveLength(1);
    expect(addCommunityPostSupport(actorA, repository, 'plain-domain', NOW)).toEqual({
      supportCount: 1,
      supportedByMe: true,
    });
    expect(saveCommunityPost(actorA, repository, 'plain-domain', NOW)).toEqual({ savedByMe: true });
  });
});
