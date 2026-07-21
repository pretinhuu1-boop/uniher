import Database from 'better-sqlite3';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

import playwrightDbSafety from '../playwright-db-safety.cjs';
import { extractAccessTokenFromSetCookie, expectPrivateResponse } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const PASSWORD = 'Admin@2026';
const RUN_ID = `${Date.now()}-${process.pid}`;
const COMPANY_B_SENTINEL = `COMMUNITY-B-SENTINEL-${RUN_ID}`;

const ids = {
  companyA: `community-feed-company-a-${RUN_ID}`,
  companyB: `community-feed-company-b-${RUN_ID}`,
  companyDisabled: `community-feed-company-disabled-${RUN_ID}`,
  collaboratorA: `community-feed-collaborator-a-${RUN_ID}`,
  collaboratorAHidden: `community-feed-collaborator-hidden-${RUN_ID}`,
  collaboratorB: `community-feed-collaborator-b-${RUN_ID}`,
  collaboratorDisabled: `community-feed-collaborator-disabled-${RUN_ID}`,
  dualRoleA: `community-feed-dual-role-${RUN_ID}`,
  postA: `community-feed-post-a-${RUN_ID}`,
  postB: `community-feed-post-b-${RUN_ID}`,
  postDisabled: `community-feed-post-disabled-${RUN_ID}`,
};

const emails = {
  collaboratorA: `community-feed-test-a-${RUN_ID}@local.invalid`,
  collaboratorAHidden: `community-feed-test-hidden-${RUN_ID}@local.invalid`,
  collaboratorB: `community-feed-test-b-${RUN_ID}@local.invalid`,
  collaboratorDisabled: `community-feed-test-disabled-${RUN_ID}@local.invalid`,
  dualRoleA: `community-feed-test-dual-${RUN_ID}@local.invalid`,
};

type Tokens = Record<keyof typeof emails, string>;
let tokens: Tokens;

function openPlaywrightDatabase(): Database.Database {
  return new Database(playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env));
}

function authHeaders(token: string) {
  return { Cookie: `uniher-access-token=${token}` };
}

async function login(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password: PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
  return extractAccessTokenFromSetCookie(response);
}

function seedCommunityFixtures() {
  const db = openPlaywrightDatabase();
  try {
    const admin = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(ADMIN_EMAIL) as
      | { password_hash: string }
      | undefined;
    if (!admin) throw new Error('Seeded Playwright admin was not found');

    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, trade_name, cnpj, sector, plan, is_active)
      VALUES (?, ?, ?, ?, 'community-e2e', 'enterprise', 1)
    `);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, company_id, name, nickname, email, password_hash, role,
        approved, blocked, must_change_password, also_collaborator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)
    `);
    const insertSetting = db.prepare(`
      INSERT INTO company_settings (id, company_id, setting_key, setting_value)
      VALUES (?, ?, 'feed_company_enabled', ?)
      ON CONFLICT(company_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `);
    const insertPost = db.prepare(`
      INSERT INTO community_posts (
        id, company_id, title, summary, body_text, topic, read_time_minutes,
        status, published_at, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 4, 'published', ?, ?, ?, ?, ?)
    `);
    const publishedAt = '2026-07-20T12:00:00.000Z';
    const createdAt = '2026-07-20T11:00:00.000Z';

    db.transaction(() => {
      insertCompany.run(ids.companyA, `Community Feed E2E A ${RUN_ID}`, 'Community A', `81${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);
      insertCompany.run(ids.companyB, `Community Feed E2E B ${RUN_ID}`, 'Community B', `82${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);
      insertCompany.run(ids.companyDisabled, `Community Feed E2E Disabled ${RUN_ID}`, 'Community Disabled', `83${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);

      insertUser.run(ids.collaboratorA, ids.companyA, 'Ana Segura', 'Ana Comunidade', emails.collaboratorA, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorAHidden, ids.companyA, 'Beatriz Privada', null, emails.collaboratorAHidden, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorB, ids.companyB, 'Carla Empresa B', null, emails.collaboratorB, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorDisabled, ids.companyDisabled, 'Dora Sem Feed', null, emails.collaboratorDisabled, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.dualRoleA, ids.companyA, 'Eva Dupla Funcao', null, emails.dualRoleA, admin.password_hash, 'rh', 1);

      insertSetting.run(`community-feed-setting-a-${RUN_ID}`, ids.companyA, '1');
      insertSetting.run(`community-feed-setting-b-${RUN_ID}`, ids.companyB, '1');
      insertSetting.run(`community-feed-setting-disabled-${RUN_ID}`, ids.companyDisabled, '0');

      insertPost.run(ids.postA, ids.companyA, 'Pausas que cabem no dia', 'Um guia pratico para recuperar energia com seguranca.', 'Conteudo seguro da empresa A para colaboradoras autorizadas.', 'pausas', publishedAt, ids.dualRoleA, ids.dualRoleA, createdAt, createdAt);
      insertPost.run(ids.postB, ids.companyB, COMPANY_B_SENTINEL, 'Conteudo exclusivo e isolado da empresa B.', 'Este corpo tambem deve permanecer restrito ao tenant B.', 'sono', publishedAt, ids.collaboratorB, ids.collaboratorB, createdAt, createdAt);
      insertPost.run(ids.postDisabled, ids.companyDisabled, 'Post de feed desativado', 'Este item nao aparece enquanto o feed estiver desligado.', 'Conteudo bloqueado pelo default-off da comunidade.', 'geral', publishedAt, ids.collaboratorDisabled, ids.collaboratorDisabled, createdAt, createdAt);

      db.prepare(`
        INSERT INTO user_preferences (user_id, pref_key, pref_value)
        VALUES (?, 'privacy_community_supporter_name', '1')
      `).run(ids.collaboratorA);
    })();
  } finally {
    db.close();
  }
}

function cleanupCommunityFixtures() {
  const db = openPlaywrightDatabase();
  try {
    db.pragma('foreign_keys = ON');
    db.transaction(() => {
      const userIds = Object.values(ids).filter((id) => id.includes('collaborator') || id.includes('dual-role'));
      const companyIds = [ids.companyA, ids.companyB, ids.companyDisabled];
      const placeholders = (values: readonly string[]) => values.map(() => '?').join(',');
      db.prepare(`DELETE FROM community_post_supports WHERE post_id IN (${placeholders([ids.postA, ids.postB, ids.postDisabled])})`).run(ids.postA, ids.postB, ids.postDisabled);
      db.prepare(`DELETE FROM community_post_saves WHERE post_id IN (${placeholders([ids.postA, ids.postB, ids.postDisabled])})`).run(ids.postA, ids.postB, ids.postDisabled);
      db.prepare(`DELETE FROM community_posts WHERE id IN (${placeholders([ids.postA, ids.postB, ids.postDisabled])})`).run(ids.postA, ids.postB, ids.postDisabled);
      db.prepare(`DELETE FROM company_settings WHERE company_id IN (${placeholders(companyIds)})`).run(...companyIds);
      db.prepare(`DELETE FROM refresh_tokens WHERE user_id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM user_preferences WHERE user_id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM companies WHERE id IN (${placeholders(companyIds)})`).run(...companyIds);
    })();
  } finally {
    db.close();
  }
}

async function expectError(response: APIResponse, status: number, code: string) {
  expect(response.status(), await response.text()).toBe(status);
  expectPrivateResponse(response);
  expect(await response.json()).toMatchObject({ code });
}

test.describe.configure({ mode: 'serial' });

test.describe('collaborator company community feed', () => {
  test.beforeAll(async ({ request }) => {
    cleanupCommunityFixtures();
    seedCommunityFixtures();
    tokens = {
      collaboratorA: await login(request, emails.collaboratorA),
      collaboratorAHidden: await login(request, emails.collaboratorAHidden),
      collaboratorB: await login(request, emails.collaboratorB),
      collaboratorDisabled: await login(request, emails.collaboratorDisabled),
      dualRoleA: await login(request, emails.dualRoleA),
    };
  });

  test.afterAll(() => cleanupCommunityFixtures());

  test('requires authentication on every collaborator community route', async ({ request }) => {
    const responses = await Promise.all([
      request.get('/api/collaborator/feed'),
      request.get('/api/collaborator/saved'),
      request.post(`/api/collaborator/feed/${ids.postA}/support`),
      request.post(`/api/collaborator/feed/${ids.postA}/save`),
      request.get(`/api/collaborator/feed/${ids.postA}/supporters`),
    ]);
    for (const response of responses) {
      expect(response.status(), await response.text()).toBe(401);
    }
  });

  test('returns only the authenticated company feed with private cache headers', async ({ request }) => {
    const response = await request.get('/api/collaborator/feed', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(response.status(), await response.text()).toBe(200);
    expectPrivateResponse(response);
    const payload = await response.json();
    expect(payload).toMatchObject({
      scope: 'company',
      settings: { companyFeedEnabled: true },
      nextCursor: null,
    });
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ id: ids.postA, supportedByMe: false, savedByMe: false });
    expect(JSON.stringify(payload)).not.toContain(COMPANY_B_SENTINEL);
  });

  test('accepts and revalidates dual-role persisted collaborator capability', async ({ request }) => {
    const response = await request.get('/api/collaborator/feed', {
      headers: authHeaders(tokens.dualRoleA),
    });
    expect(response.status(), await response.text()).toBe(200);
    expectPrivateResponse(response);
    expect((await response.json()).items[0].id).toBe(ids.postA);

    const db = openPlaywrightDatabase();
    try {
      db.prepare('UPDATE users SET also_collaborator = 0 WHERE id = ?').run(ids.dualRoleA);
    } finally {
      db.close();
    }
    try {
      await expectError(await request.get('/api/collaborator/feed', {
        headers: authHeaders(tokens.dualRoleA),
      }), 403, 'COLLABORATOR_CAPABILITY_REQUIRED');
    } finally {
      const restoreDb = openPlaywrightDatabase();
      try {
        restoreDb.prepare('UPDATE users SET also_collaborator = 1 WHERE id = ?').run(ids.dualRoleA);
      } finally {
        restoreDb.close();
      }
    }
  });

  test('rejects unsupported scopes and malformed feed queries with stable 422 codes', async ({ request }) => {
    for (const scope of ['group', 'global']) {
      await expectError(await request.get(`/api/collaborator/feed?scope=${scope}`, {
        headers: authHeaders(tokens.collaboratorA),
      }), 422, 'COMMUNITY_SCOPE_UNSUPPORTED');
    }
    await expectError(await request.get('/api/collaborator/feed?scope=company&scope=group', {
      headers: authHeaders(tokens.collaboratorA),
    }), 422, 'COMMUNITY_SCOPE_UNSUPPORTED');
    for (const query of ['topic=segredo', 'limit=31']) {
      await expectError(await request.get(`/api/collaborator/feed?${query}`, {
        headers: authHeaders(tokens.collaboratorA),
      }), 422, 'COMMUNITY_QUERY_INVALID');
    }
    await expectError(await request.get('/api/collaborator/feed?cursor=not-a-cursor', {
      headers: authHeaders(tokens.collaboratorA),
    }), 422, 'COMMUNITY_CURSOR_INVALID');
  });

  test('blocks company A from company B post relations by ID', async ({ request }) => {
    const options = { headers: authHeaders(tokens.collaboratorA) };
    await expectError(await request.post(`/api/collaborator/feed/${ids.postB}/support`, options), 404, 'POST_NOT_FOUND');
    await expectError(await request.delete(`/api/collaborator/feed/${ids.postB}/support`, options), 404, 'POST_NOT_FOUND');
    await expectError(await request.post(`/api/collaborator/feed/${ids.postB}/save`, options), 404, 'POST_NOT_FOUND');
    await expectError(await request.delete(`/api/collaborator/feed/${ids.postB}/save`, options), 404, 'POST_NOT_FOUND');
    await expectError(await request.get(`/api/collaborator/feed/${ids.postB}/supporters`, options), 404, 'POST_NOT_FOUND');
  });

  test('keeps disabled-company feed default-off and blocks reads and writes', async ({ request }) => {
    const options = { headers: authHeaders(tokens.collaboratorDisabled) };
    const feed = await request.get('/api/collaborator/feed', options);
    expect(feed.status(), await feed.text()).toBe(200);
    expectPrivateResponse(feed);
    expect(await feed.json()).toEqual({
      items: [],
      nextCursor: null,
      scope: 'company',
      settings: { companyFeedEnabled: false },
    });
    await expectError(await request.post(`/api/collaborator/feed/${ids.postDisabled}/support`, options), 403, 'FEED_DISABLED');
    await expectError(await request.post(`/api/collaborator/feed/${ids.postDisabled}/save`, options), 403, 'FEED_DISABLED');
    await expectError(await request.get(`/api/collaborator/feed/${ids.postDisabled}/supporters`, options), 403, 'FEED_DISABLED');
  });

  test('adds support idempotently without parsing a body and removes it', async ({ request }) => {
    const options = {
      headers: { ...authHeaders(tokens.collaboratorA), 'Content-Type': 'application/json' },
      data: '{invalid-json',
    };
    const first = await request.post(`/api/collaborator/feed/${ids.postA}/support`, options);
    expect(first.status(), await first.text()).toBe(200);
    expectPrivateResponse(first);
    expect(await first.json()).toEqual({ supportCount: 1, supportedByMe: true });

    const duplicate = await request.post(`/api/collaborator/feed/${ids.postA}/support`, options);
    expect(duplicate.status(), await duplicate.text()).toBe(200);
    expect(await duplicate.json()).toEqual({ supportCount: 1, supportedByMe: true });

    const removed = await request.delete(`/api/collaborator/feed/${ids.postA}/support`, options);
    expect(removed.status(), await removed.text()).toBe(200);
    expectPrivateResponse(removed);
    expect(await removed.json()).toEqual({ supportCount: 0, supportedByMe: false });
  });

  test('adds and removes saves and exposes only the current user saved list', async ({ request }) => {
    const options = { headers: authHeaders(tokens.collaboratorA) };
    const added = await request.post(`/api/collaborator/feed/${ids.postA}/save`, options);
    expect(added.status(), await added.text()).toBe(200);
    expectPrivateResponse(added);
    expect(await added.json()).toEqual({ savedByMe: true });

    const saved = await request.get('/api/collaborator/saved', options);
    expect(saved.status(), await saved.text()).toBe(200);
    expectPrivateResponse(saved);
    const savedPayload = await saved.json();
    expect(savedPayload.items).toHaveLength(1);
    expect(savedPayload.items[0]).toMatchObject({ id: ids.postA, savedByMe: true });
    expect(JSON.stringify(savedPayload)).not.toContain(COMPANY_B_SENTINEL);

    const removed = await request.delete(`/api/collaborator/feed/${ids.postA}/save`, options);
    expect(removed.status(), await removed.text()).toBe(200);
    expect(await removed.json()).toEqual({ savedByMe: false });
    expect((await (await request.get('/api/collaborator/saved', options)).json()).items).toEqual([]);
  });

  test('returns only opted-in supporter names and no identity metadata', async ({ request }) => {
    await request.post(`/api/collaborator/feed/${ids.postA}/support`, {
      headers: authHeaders(tokens.collaboratorA),
    });
    await request.post(`/api/collaborator/feed/${ids.postA}/support`, {
      headers: authHeaders(tokens.collaboratorAHidden),
    });

    const response = await request.get(`/api/collaborator/feed/${ids.postA}/supporters?limit=20`, {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(response.status(), await response.text()).toBe(200);
    expectPrivateResponse(response);
    const payload = await response.json();
    expect(payload).toEqual({ names: ['Ana Comunidade'], nextCursor: null });
    expect(Object.keys(payload).sort()).toEqual(['names', 'nextCursor']);
    expect(JSON.stringify(payload)).not.toMatch(/email|role|user_?id/i);

    await expectError(await request.get(`/api/collaborator/feed/${ids.postA}/supporters?limit=21`, {
      headers: authHeaders(tokens.collaboratorA),
    }), 422, 'COMMUNITY_QUERY_INVALID');
    await expectError(await request.get(`/api/collaborator/feed/${ids.postA}/supporters?cursor=bad`, {
      headers: authHeaders(tokens.collaboratorA),
    }), 422, 'COMMUNITY_CURSOR_INVALID');
  });
});
