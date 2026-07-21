import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import {
  communityFeedQuerySchema,
  communityPostCreateSchema,
  communityPostPatchSchema,
  communitySavedQuerySchema,
  communitySupportersQuerySchema,
} from '@/lib/community/schemas';
import {
  decodeFeedCursor,
  decodeSupporterCursor,
  encodeFeedCursor,
  encodeSupporterCursor,
} from '@/lib/community/cursor';
import { createCommunityRepository } from '@/repositories/community.repository';
import {
  addCommunityPostSupport,
  CommunityServiceError,
  getCommunityFeed,
  getCommunitySupporters,
} from '@/services/community.service';

const databases: Database.Database[] = [];
const NOW = '2026-07-21T12:00:00.000Z';
const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '054_company_community_feed.sql');

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
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
      ('actor-a', 'company-a', 'Ana Operadora', NULL, 'ana@example.test', 'colaboradora'),
      ('mismatch', 'company-b', 'Bia Outra', NULL, 'bia@example.test', 'colaboradora'),
      ('support-nick', 'company-a', 'Carla Souza', '  Cacau  ', 'carla@example.test', 'rh'),
      ('support-name', 'company-a', '  Daniela Lima  ', NULL, 'daniela@example.test', 'lideranca'),
      ('support-hidden', 'company-a', 'Escondida Pessoa', 'Oculta', 'oculta@example.test', 'admin');
  `);
  applyMigration(db, '054_company_community_feed.sql', fs.readFileSync(migrationPath, 'utf8'));
  return db;
}

function enableFeed(db: Database.Database): void {
  db.prepare(`
    UPDATE company_settings SET setting_value = '1'
    WHERE company_id = 'company-a' AND setting_key = 'feed_company_enabled'
  `).run();
}

function insertPost(db: Database.Database, id = 'post-a'): void {
  db.prepare(`
    INSERT INTO community_posts (
      id, company_id, title, summary, body_text, topic, read_time_minutes, image_path,
      status, published_at, created_by, updated_by, created_at, updated_at
    ) VALUES (?, 'company-a', 'Pausa segura', 'Resumo editorial seguro.',
      'Conteudo editorial seguro e suficientemente longo.', 'pausas', 4, '/community/pause.webp',
      'published', ?, 'actor-a', 'actor-a', ?, ?)
  `).run(id, '2026-07-20T10:00:00.000Z', '2026-07-20T09:00:00.000Z', NOW);
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('community schemas and cursor policy', () => {
  it('applies feed defaults and rejects unsupported topics or invalid cursors', () => {
    expect(communityFeedQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(communityFeedQuerySchema.safeParse({ topic: 'ranking' }).success).toBe(false);
    expect(communityFeedQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
    expect(communityFeedQuerySchema.safeParse({ limit: 31 }).success).toBe(false);
    expect(communityFeedQuerySchema.safeParse({ companyId: 'company-a' }).success).toBe(false);
    expect(communityFeedQuerySchema.safeParse({ offset: 20 }).success).toBe(false);
    expect(communitySavedQuerySchema.safeParse({ limit: 30 }).success).toBe(true);
    expect(communitySavedQuerySchema.safeParse({ limit: 31 }).success).toBe(false);
    expect(communitySupportersQuerySchema.safeParse({ limit: 20 }).success).toBe(true);
    expect(communitySupportersQuerySchema.safeParse({ limit: 21 }).success).toBe(false);
  });

  it.each([
    'https://cdn.example.test/image.png',
    'http://cdn.example.test/image.png',
    '//cdn.example.test/image.png',
    '/community/../secret.png',
    '/community\\secret.png',
    '/community//image.webp',
    '/%2e%2e/secret.png',
    '/%2E%2e/secret.png',
    '/community%2fsecret.webp',
    '/community%5csecret.webp',
    '/%252e%252e/secret.png',
    '/%252525252e%252525252e/secret.png',
    '/community/bad%.webp',
    '/community/bad%2.webp',
    '/community/bad%GG.webp',
    '/community/bad%C3%28.webp',
    '/https://cdn.example.test/image.png',
    '/javascript:alert(1)',
    '/data:text/plain,x',
    '/community\\image.webp',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    ...(['http:', 'https:', 'javascript:', 'data:'] as const).flatMap((protocol) => [
      `/community/${encodeURIComponent(protocol)}payload.webp`,
      `/community/${encodeURIComponent(encodeURIComponent(protocol))}payload.webp`,
    ]),
  ])('rejects unsafe local image path %s', (imagePath) => {
    expect(communityPostCreateSchema.safeParse({
      title: 'Titulo seguro',
      summary: 'Resumo suficientemente longo.',
      bodyText: 'Corpo suficientemente longo para publicacao.',
      topic: 'cuidado',
      readTimeMinutes: 5,
      imagePath,
      status: 'draft',
    }).success).toBe(false);
  });

  it('accepts a legitimate percent-encoded UTF-8 local image path', () => {
    expect(communityPostCreateSchema.safeParse({
      title: 'Titulo seguro',
      summary: 'Resumo suficientemente longo.',
      bodyText: 'Corpo suficientemente longo para publicacao.',
      topic: 'cuidado',
      readTimeMinutes: 5,
      imagePath: '/community/sa%C3%BAde.webp',
      status: 'draft',
    }).success).toBe(true);
  });

  it('accepts null or one-slash local paths and requires non-empty patches', () => {
    const base = {
      title: 'Titulo seguro',
      summary: 'Resumo suficientemente longo.',
      bodyText: 'Corpo suficientemente longo para publicacao.',
      topic: 'cuidado',
      readTimeMinutes: 5,
      status: 'draft',
    } as const;
    expect(communityPostCreateSchema.safeParse({ ...base, imagePath: null }).success).toBe(true);
    expect(communityPostCreateSchema.safeParse({ ...base, imagePath: '/community/image.webp' }).success).toBe(true);
    expect(communityPostPatchSchema.safeParse({}).success).toBe(false);
    expect(communityPostPatchSchema.safeParse({ title: 'Novo titulo' }).success).toBe(true);
  });

  it('canonicalizes create and patch editorial timestamps to equivalent UTC', () => {
    const base = {
      title: 'Titulo seguro',
      summary: 'Resumo suficientemente longo.',
      bodyText: 'Corpo suficientemente longo para publicacao.',
      topic: 'cuidado',
      readTimeMinutes: 5,
      status: 'published',
    } as const;
    const created = communityPostCreateSchema.parse({
      ...base,
      publishedAt: '2026-07-21T10:00:00+03:00',
      expiresAt: '2026-07-22T10:00:00+03:00',
    });
    const patched = communityPostPatchSchema.parse({
      publishedAt: '2026-07-21T10:00:00+03:00',
      expiresAt: '2026-07-22T10:00:00+03:00',
    });

    expect(created.publishedAt).toBe('2026-07-21T07:00:00.000Z');
    expect(created.expiresAt).toBe('2026-07-22T07:00:00.000Z');
    expect(patched.publishedAt).toBe('2026-07-21T07:00:00.000Z');
    expect(patched.expiresAt).toBe('2026-07-22T07:00:00.000Z');
    expect(communityPostPatchSchema.parse({
      publishedAt: '2026-07-21T10:00:00.123Z',
    }).publishedAt).toBe('2026-07-21T10:00:00.123Z');
  });

  it('requires publishedAt when create or patch explicitly publishes a post', () => {
    const base = {
      title: 'Titulo seguro',
      summary: 'Resumo suficientemente longo.',
      bodyText: 'Corpo suficientemente longo para publicacao.',
      topic: 'cuidado',
      readTimeMinutes: 5,
      status: 'published',
    } as const;

    expect(communityPostCreateSchema.safeParse(base).success).toBe(false);
    expect(communityPostCreateSchema.safeParse({ ...base, publishedAt: null }).success).toBe(false);
    expect(communityPostCreateSchema.safeParse({
      ...base,
      publishedAt: '2026-07-21T10:00:00.000Z',
    }).success).toBe(true);
    expect(communityPostPatchSchema.safeParse({ status: 'published' }).success).toBe(false);
    expect(communityPostPatchSchema.safeParse({ status: 'published', publishedAt: null }).success).toBe(false);
    expect(communityPostPatchSchema.safeParse({
      status: 'published',
      publishedAt: '2026-07-21T10:00:00.000Z',
    }).success).toBe(true);
    expect(communityPostPatchSchema.safeParse({ status: 'draft' }).success).toBe(true);
  });

  it('round-trips canonical cursors and rejects malformed or non-canonical encodings', () => {
    const feedTuple = ['2026-07-20T10:00:00.000Z', '2026-07-20T09:00:00.000Z', 'post-a'] as const;
    const supporterTuple = ['2026-07-20T08:00:00.000Z', '42'] as const;
    expect(decodeFeedCursor(encodeFeedCursor(feedTuple))).toEqual(feedTuple);
    expect(decodeSupporterCursor(encodeSupporterCursor(supporterTuple))).toEqual(supporterTuple);

    const nonCanonical = Buffer.from(JSON.stringify([...feedTuple], null, 2)).toString('base64url');
    const rawCursor = (tuple: unknown[]) => Buffer.from(JSON.stringify(tuple)).toString('base64url');
    expect(() => decodeFeedCursor('not-base64url!')).toThrow();
    expect(() => decodeFeedCursor(`${encodeFeedCursor(feedTuple)}=`)).toThrow();
    expect(() => decodeFeedCursor(nonCanonical)).toThrow();
    expect(() => decodeFeedCursor(Buffer.from(JSON.stringify([...feedTuple, 'extra'])).toString('base64url'))).toThrow();
    expect(() => decodeFeedCursor(rawCursor(['not-a-date', feedTuple[1], 'post-a']))).toThrow();
    expect(() => decodeFeedCursor(rawCursor([feedTuple[0], '2026-07-20', 'post-a']))).toThrow();
    expect(() => decodeSupporterCursor(rawCursor(['not-a-date', '42']))).toThrow();
    expect(() => decodeFeedCursor(rawCursor([
      '2026-07-21T10:00:00+03:00',
      feedTuple[1],
      'post-a',
    ]))).toThrow();
    expect(() => decodeFeedCursor(rawCursor([
      feedTuple[0],
      '2026-07-21T10:00:00-04:00',
      'post-a',
    ]))).toThrow();
    expect(() => decodeSupporterCursor(rawCursor(['2026-07-21T10:00:00+03:00', '42']))).toThrow();
    for (const invalidRowId of ['0', '01', '-1', '1.0', 'actor-a']) {
      expect(() => decodeSupporterCursor(rawCursor([supporterTuple[0], invalidRowId]))).toThrow();
    }
  });
});

describe('community access and privacy policy', () => {
  it('denies a missing company id with a stable typed error', () => {
    const repository = createCommunityRepository(createDatabase());
    expect(() => getCommunityFeed({ userId: 'actor-a' }, repository, {}, NOW)).toThrowError(
      expect.objectContaining<Partial<CommunityServiceError>>({ code: 'COMPANY_REQUIRED', statusCode: 400 }),
    );
  });

  it('denies a user/company mismatch', () => {
    const repository = createCommunityRepository(createDatabase());
    expect(() => getCommunityFeed(
      { userId: 'mismatch', companyId: 'company-a' },
      repository,
      {},
      NOW,
    )).toThrowError(expect.objectContaining<Partial<CommunityServiceError>>({
      code: 'MEMBERSHIP_DENIED',
      statusCode: 403,
    }));
  });

  it.each([
    ['inactive', { isActive: 0, deletedAt: null }],
    ['soft-deleted', { isActive: 1, deletedAt: '2026-07-21T08:00:00.000Z' }],
  ])('denies feed and mutations for an %s company', (_case, company) => {
    const db = createDatabase();
    enableFeed(db);
    insertPost(db);
    db.prepare(`UPDATE companies SET is_active = ?, deleted_at = ? WHERE id = 'company-a'`)
      .run(company.isActive, company.deletedAt);
    const repository = createCommunityRepository(db);

    expect(repository.isActiveMember('actor-a', 'company-a')).toBe(false);
    for (const action of [
      () => getCommunityFeed({ userId: 'actor-a', companyId: 'company-a' }, repository, {}, NOW),
      () => addCommunityPostSupport(
        { userId: 'actor-a', companyId: 'company-a' },
        repository,
        'post-a',
        NOW,
      ),
    ]) {
      expect(action).toThrowError(expect.objectContaining<Partial<CommunityServiceError>>({
        code: 'MEMBERSHIP_DENIED',
        statusCode: 403,
      }));
    }
    expect(db.prepare(`SELECT COUNT(*) AS count FROM community_post_supports`).get()).toEqual({ count: 0 });
  });

  it('returns the exact disabled response without posts', () => {
    const db = createDatabase();
    insertPost(db);
    const repository = createCommunityRepository(db);
    const listFeed = vi.spyOn(repository, 'listFeed');
    const response = getCommunityFeed(
      { userId: 'actor-a', companyId: 'company-a' },
      repository,
      {},
      NOW,
    );

    expect(response).toEqual({
      items: [],
      nextCursor: null,
      scope: 'company',
      settings: { companyFeedEnabled: false },
    });
    expect(listFeed).not.toHaveBeenCalled();
  });

  it('blocks supporter reads before checking or querying the post when the feed is disabled', () => {
    const db = createDatabase();
    insertPost(db);
    const repository = createCommunityRepository(db);
    const hasActivePublishedPost = vi.spyOn(repository, 'hasActivePublishedPost');
    const listSupporters = vi.spyOn(repository, 'listSupporters');

    expect(() => getCommunitySupporters(
      { userId: 'actor-a', companyId: 'company-a' },
      repository,
      'post-a',
      {},
      NOW,
    )).toThrowError(expect.objectContaining<Partial<CommunityServiceError>>({
      code: 'FEED_DISABLED',
      statusCode: 403,
    }));
    expect(hasActivePublishedPost).not.toHaveBeenCalled();
    expect(listSupporters).not.toHaveBeenCalled();
  });

  it('projects feed cards without forbidden privacy fields', () => {
    const db = createDatabase();
    enableFeed(db);
    insertPost(db);
    const response = getCommunityFeed(
      { userId: 'actor-a', companyId: 'company-a' },
      createCommunityRepository(db),
      {},
      NOW,
    );
    const json = JSON.stringify(response);

    expect(Object.keys(response.items[0])).toEqual([
      'id', 'title', 'summary', 'bodyText', 'topic', 'readTimeMinutes', 'imagePath',
      'publishedAt', 'supportCount', 'supportedByMe', 'savedByMe',
    ]);
    for (const forbidden of [
      'companyId', 'company_id', 'author', 'userId', 'user_id', 'email', 'role', 'department',
      'health', 'score', 'classification', 'nr1', 'semaforo', 'checkin',
    ]) {
      expect(json.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('returns only opted-in supporter display names and cursor keys', () => {
    const db = createDatabase();
    enableFeed(db);
    insertPost(db);
    db.exec(`
      INSERT INTO community_post_supports (post_id, user_id, created_at) VALUES
        ('post-a', 'support-hidden', '2026-07-20T08:02:00.000Z'),
        ('post-a', 'support-name', '2026-07-20T08:01:00.000Z'),
        ('post-a', 'support-nick', '2026-07-20T08:00:00.000Z');
      INSERT INTO user_preferences (user_id, pref_key, pref_value) VALUES
        ('support-hidden', 'privacy_community_supporter_name', '0'),
        ('support-name', 'privacy_community_supporter_name', '1'),
        ('support-nick', 'privacy_community_supporter_name', '1');
    `);

    const response = getCommunitySupporters(
      { userId: 'actor-a', companyId: 'company-a' },
      createCommunityRepository(db),
      'post-a',
      { limit: 20 },
      NOW,
    );

    expect(response).toEqual({ names: ['Daniela', 'Cacau'], nextCursor: null });
    expect(Object.keys(response)).toEqual(['names', 'nextCursor']);
    expect(JSON.stringify(response)).not.toContain('support-');
  });
});
