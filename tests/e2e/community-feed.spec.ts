import Database from 'better-sqlite3';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

import playwrightDbSafety from '../playwright-db-safety.cjs';
import { extractAccessTokenFromSetCookie, expectPrivateResponse } from './helpers/auth';
import { communityApiErrorResponse } from '../../src/lib/community/api';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const PASSWORD = 'Admin@2026';
const RUN_ID = `${Date.now()}-${process.pid}`;
const COMPANY_B_SENTINEL = `COMMUNITY-B-SENTINEL-${RUN_ID}`;
const MASTER_POST_TITLE = `MASTER-COMMUNITY-${RUN_ID}`;

const ids = {
  companyA: `community-feed-company-a-${RUN_ID}`,
  companyB: `community-feed-company-b-${RUN_ID}`,
  companyDisabled: `community-feed-company-disabled-${RUN_ID}`,
  companyInactive: `community-feed-company-inactive-${RUN_ID}`,
  collaboratorA: `community-feed-collaborator-a-${RUN_ID}`,
  collaboratorAHidden: `community-feed-collaborator-hidden-${RUN_ID}`,
  collaboratorB: `community-feed-collaborator-b-${RUN_ID}`,
  collaboratorDisabled: `community-feed-collaborator-disabled-${RUN_ID}`,
  dualRoleA: `community-feed-dual-role-${RUN_ID}`,
  rhB: `community-feed-rh-b-${RUN_ID}`,
  rhDisabled: `community-feed-rh-disabled-${RUN_ID}`,
  companyAdminA: `community-feed-admin-a-${RUN_ID}`,
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
  rhB: `community-feed-test-rh-b-${RUN_ID}@local.invalid`,
  rhDisabled: `community-feed-test-rh-disabled-${RUN_ID}@local.invalid`,
  companyAdminA: `community-feed-test-admin-a-${RUN_ID}@local.invalid`,
  master: ADMIN_EMAIL,
};

type Tokens = Record<keyof typeof emails, string>;
let tokens: Tokens;
let editorialDraftId = '';
let masterEditorialPostId = '';

function editorialInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Pausa editorial segura',
    summary: 'Orientacao editorial para uma pausa consciente durante o trabalho.',
    bodyText: 'Conteudo em texto simples, suficientemente detalhado para a comunidade da empresa.',
    topic: 'pausas',
    readTimeMinutes: 4,
    status: 'draft',
    ...overrides,
  };
}

function openPlaywrightDatabase(): Database.Database {
  const databasePath = playwrightDbSafety.assertCommunityFeedFixtureEnvironment(process.env);
  return new Database(databasePath);
}

function authHeaders(token: string) {
  return { Cookie: `uniher-access-token=${token}` };
}

function setCompanyFeedEnabled(companyId: string, enabled: boolean) {
  const db = openPlaywrightDatabase();
  try {
    db.prepare(`
      INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, 'feed_company_enabled', ?, ?)
      ON CONFLICT(company_id, setting_key)
      DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
    `).run(
      `community-browser-setting-${companyId}-${RUN_ID}`,
      companyId,
      enabled ? '1' : '0',
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
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
      insertCompany.run(ids.companyInactive, `Community Feed E2E Inactive ${RUN_ID}`, 'Community Inactive', `84${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);
      db.prepare('UPDATE companies SET is_active = 0 WHERE id = ?').run(ids.companyInactive);

      insertUser.run(ids.collaboratorA, ids.companyA, 'Ana Segura', 'Ana Comunidade', emails.collaboratorA, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorAHidden, ids.companyA, 'Beatriz Privada', null, emails.collaboratorAHidden, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorB, ids.companyB, 'Carla Empresa B', null, emails.collaboratorB, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.collaboratorDisabled, ids.companyDisabled, 'Dora Sem Feed', null, emails.collaboratorDisabled, admin.password_hash, 'colaboradora', 0);
      insertUser.run(ids.dualRoleA, ids.companyA, 'Eva Dupla Funcao', null, emails.dualRoleA, admin.password_hash, 'rh', 1);
      insertUser.run(ids.rhB, ids.companyB, 'Renata RH B', null, emails.rhB, admin.password_hash, 'rh', 0);
      insertUser.run(ids.rhDisabled, ids.companyDisabled, 'Rita RH Disabled', null, emails.rhDisabled, admin.password_hash, 'rh', 0);
      insertUser.run(ids.companyAdminA, ids.companyA, 'Alice Admin Empresa', null, emails.companyAdminA, admin.password_hash, 'admin', 0);

      insertSetting.run(`community-feed-setting-a-${RUN_ID}`, ids.companyA, '1');
      insertSetting.run(`community-feed-setting-b-${RUN_ID}`, ids.companyB, '1');

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
  const previousForeignKeys = Number(db.pragma('foreign_keys', { simple: true }));
  try {
    db.pragma('foreign_keys = ON');
    db.transaction(() => {
      const userIds = [
        ids.collaboratorA,
        ids.collaboratorAHidden,
        ids.collaboratorB,
        ids.collaboratorDisabled,
        ids.dualRoleA,
        ids.rhB,
        ids.rhDisabled,
        ids.companyAdminA,
      ];
      const companyIds = [ids.companyA, ids.companyB, ids.companyDisabled, ids.companyInactive];
      const placeholders = (values: readonly string[]) => values.map(() => '?').join(',');
      const companyPlaceholders = placeholders(companyIds);
      db.prepare(`
        DELETE FROM community_post_supports
        WHERE post_id IN (SELECT id FROM community_posts WHERE company_id IN (${companyPlaceholders}))
      `).run(...companyIds);
      db.prepare(`
        DELETE FROM community_post_saves
        WHERE post_id IN (SELECT id FROM community_posts WHERE company_id IN (${companyPlaceholders}))
      `).run(...companyIds);
      db.prepare(`DELETE FROM community_posts WHERE company_id IN (${companyPlaceholders})`).run(...companyIds);
      db.prepare(`DELETE FROM audit_logs WHERE actor_id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM company_settings WHERE company_id IN (${placeholders(companyIds)})`).run(...companyIds);
      db.prepare(`DELETE FROM refresh_tokens WHERE user_id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM user_preferences WHERE user_id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders(userIds)})`).run(...userIds);
      db.prepare(`DELETE FROM companies WHERE id IN (${placeholders(companyIds)})`).run(...companyIds);
    })();
  } finally {
    db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
    db.close();
  }
}

async function expectError(response: APIResponse, status: number, code: string) {
  expect(response.status(), await response.text()).toBe(status);
  expectPrivateResponse(response);
  expect(await response.json()).toMatchObject({ code });
}

test.describe.configure({ mode: 'serial' });

test('maps unexpected community API errors to a safe 500 response', async () => {
  const response = communityApiErrorResponse(new Error('community-secret-sentinel'));
  expect(response.status).toBe(500);
  const payload = await response.json();
  expect(payload).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  expect(JSON.stringify(payload)).not.toContain('community-secret-sentinel');
});

test.describe('company community feed', () => {
  test.beforeAll(async ({ request }) => {
    cleanupCommunityFixtures();
    seedCommunityFixtures();
    tokens = {
      collaboratorA: await login(request, emails.collaboratorA),
      collaboratorAHidden: await login(request, emails.collaboratorAHidden),
      collaboratorB: await login(request, emails.collaboratorB),
      collaboratorDisabled: await login(request, emails.collaboratorDisabled),
      dualRoleA: await login(request, emails.dualRoleA),
      rhB: await login(request, emails.rhB),
      rhDisabled: await login(request, emails.rhDisabled),
      companyAdminA: await login(request, emails.companyAdminA),
      master: await login(request, emails.master),
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
      request.get('/api/users/me/preferences'),
      request.patch('/api/users/me/preferences', {
        data: { preferences: { privacy_community_supporter_name: '1' } },
      }),
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

  test('rejects repeated community query keys instead of accepting the last value', async ({ request }) => {
    const validFeedCursor = Buffer.from(JSON.stringify([
      '2026-07-20T12:00:00.000Z',
      '2026-07-20T11:00:00.000Z',
      ids.postA,
    ])).toString('base64url');
    const validSupporterCursor = Buffer.from(JSON.stringify([
      '2026-07-20T12:00:00.000Z',
      '1',
    ])).toString('base64url');
    const paths = [
      '/api/collaborator/feed?topic=segredo&topic=pausas',
      '/api/collaborator/feed?limit=31&limit=20',
      `/api/collaborator/feed?cursor=bad&cursor=${validFeedCursor}`,
      '/api/collaborator/saved?limit=31&limit=20',
      `/api/collaborator/saved?cursor=bad&cursor=${validFeedCursor}`,
      `/api/collaborator/feed/${ids.postA}/supporters?limit=21&limit=20`,
      `/api/collaborator/feed/${ids.postA}/supporters?cursor=bad&cursor=${validSupporterCursor}`,
    ];

    for (const path of paths) {
      await expectError(await request.get(path, {
        headers: authHeaders(tokens.collaboratorA),
      }), 422, 'COMMUNITY_QUERY_INVALID');
    }
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

  test('persists isolated supporter-name consent and applies revocation immediately', async ({ request }) => {
    const preferenceKey = 'privacy_community_supporter_name';
    const requestIp = '198.51.100.91';
    const optedIn = { headers: authHeaders(tokens.collaboratorA) };
    const defaultOff = { headers: authHeaders(tokens.collaboratorAHidden) };

    const ownPreference = await request.get('/api/users/me/preferences', optedIn);
    expect(ownPreference.status(), await ownPreference.text()).toBe(200);
    expectPrivateResponse(ownPreference);
    expect((await ownPreference.json()).preferences[preferenceKey]).toBe('1');

    const otherPreference = await request.get('/api/users/me/preferences', defaultOff);
    expect(otherPreference.status(), await otherPreference.text()).toBe(200);
    expectPrivateResponse(otherPreference);
    expect((await otherPreference.json()).preferences).toMatchObject({ [preferenceKey]: '0' });

    const invalid = await request.patch('/api/users/me/preferences', {
      ...defaultOff,
      data: { preferences: { [preferenceKey]: '2' } },
    });
    expect(invalid.status(), await invalid.text()).toBe(400);

    const support = await request.post(`/api/collaborator/feed/${ids.postA}/support`, optedIn);
    expect(support.status(), await support.text()).toBe(200);
    const feedBefore = await request.get('/api/collaborator/feed', optedIn);
    const beforeItem = (await feedBefore.json()).items.find((item: { id: string }) => item.id === ids.postA);
    expect(beforeItem.supportedByMe).toBe(true);
    const supportCountBefore = beforeItem.supportCount;

    const namesBefore = await request.get(`/api/collaborator/feed/${ids.postA}/supporters`, optedIn);
    expect((await namesBefore.json()).names).toContain('Ana Comunidade');

    const revokeOptions = {
      headers: {
        ...authHeaders(tokens.collaboratorA),
        'x-forwarded-for': `${requestIp}, 10.0.0.9`,
      },
      data: { preferences: { [preferenceKey]: '0' } },
    };
    const revoked = await request.patch('/api/users/me/preferences', revokeOptions);
    expect(revoked.status(), await revoked.text()).toBe(200);
    const repeated = await request.patch('/api/users/me/preferences', revokeOptions);
    expect(repeated.status(), await repeated.text()).toBe(200);

    const namesAfter = await request.get(`/api/collaborator/feed/${ids.postA}/supporters`, optedIn);
    expect(await namesAfter.json()).toEqual({ names: [], nextCursor: null });
    const feedAfter = await request.get('/api/collaborator/feed', optedIn);
    const afterItem = (await feedAfter.json()).items.find((item: { id: string }) => item.id === ids.postA);
    expect(afterItem).toMatchObject({ supportedByMe: true, supportCount: supportCountBefore });

    const db = openPlaywrightDatabase();
    try {
      expect(db.prepare(`
        SELECT COUNT(*) FROM community_post_supports WHERE post_id = ? AND user_id = ?
      `).pluck().get(ids.postA, ids.collaboratorA)).toBe(1);
      const receipts = db.prepare(`
        SELECT actor_id, actor_email, actor_role, action, entity_type, entity_id,
               details, ip, created_at
        FROM audit_logs
        WHERE action = 'user_preference_update' AND actor_id = ?
        ORDER BY created_at ASC, rowid ASC
      `).all(ids.collaboratorA) as Array<Record<string, string>>;
      expect(receipts).toHaveLength(1);
      expect(receipts[0]).toMatchObject({
        actor_id: ids.collaboratorA,
        actor_email: emails.collaboratorA,
        actor_role: 'colaboradora',
        action: 'user_preference_update',
        entity_type: 'user_preference',
        entity_id: ids.collaboratorA,
        ip: requestIp,
      });
      expect(JSON.parse(receipts[0].details)).toEqual({
        key: preferenceKey,
        timestamp: receipts[0].created_at,
      });
    } finally {
      db.close();
    }

    const restored = await request.patch('/api/users/me/preferences', {
      ...optedIn,
      data: { preferences: { [preferenceKey]: '1' } },
    });
    expect(restored.status(), await restored.text()).toBe(200);
  });

  test('rate-limits collaborator community writes with a stable private 429', async ({ request }) => {
    for (let index = 0; index < 30; index += 1) {
      const relation = index % 2 === 0 ? 'support' : 'save';
      const response = await request.post(`/api/collaborator/feed/${ids.postB}/${relation}`, {
        headers: {
          ...authHeaders(tokens.collaboratorB),
          'x-forwarded-for': `198.51.100.${index + 1}`,
        },
      });
      expect(response.status(), `write ${index + 1}: ${await response.text()}`).toBe(200);
    }

    const limited = await request.delete(`/api/collaborator/feed/${ids.postB}/save`, {
      headers: {
        ...authHeaders(tokens.collaboratorB),
        'x-forwarded-for': '203.0.113.250',
      },
    });
    expect(limited.status(), await limited.text()).toBe(429);
    expectPrivateResponse(limited);
    expect(await limited.json()).toMatchObject({ status: 429, code: 'RATE_LIMIT' });
  });

  test('requires authentication and rejects collaborators on editorial management routes', async ({ request }) => {
    expect((await request.get('/api/rh/community/posts')).status()).toBe(401);
    expect((await request.post('/api/rh/community/posts', { data: editorialInput() })).status()).toBe(401);
    expect((await request.patch(`/api/rh/community/posts/${ids.postA}`, {
      data: { status: 'archived' },
    })).status()).toBe(401);

    const collaboratorOptions = { headers: authHeaders(tokens.collaboratorA) };
    expect((await request.get('/api/rh/community/posts', collaboratorOptions)).status()).toBe(403);
    expect((await request.post('/api/rh/community/posts', {
      ...collaboratorOptions,
      data: editorialInput(),
    })).status()).toBe(403);
    expect((await request.patch(`/api/rh/community/posts/${ids.postA}`, {
      ...collaboratorOptions,
      data: { status: 'archived' },
    })).status()).toBe(403);
    expect((await request.patch('/api/company', {
      ...collaboratorOptions,
      data: { feedCompanyEnabled: true },
    })).status()).toBe(403);
  });

  test('scopes RH and company-admin reads to their authenticated company', async ({ request }) => {
    const rhA = { headers: authHeaders(tokens.dualRoleA) };
    const listA = await request.get('/api/rh/community/posts?status=published', rhA);
    expect(listA.status(), await listA.text()).toBe(200);
    expectPrivateResponse(listA);
    const listPayload = await listA.json();
    expect(Object.keys(listPayload).sort()).toEqual(['companyId', 'items', 'settings', 'status']);
    expect(listPayload).toMatchObject({
      companyId: ids.companyA,
      status: 'published',
      settings: { companyFeedEnabled: true },
    });
    expect(listPayload.items.map((item: { id: string }) => item.id)).toContain(ids.postA);
    expect(JSON.stringify(listPayload)).not.toContain(COMPANY_B_SENTINEL);

    await expectError(await request.get(`/api/rh/community/posts?companyId=${ids.companyB}`, rhA), 403, 'COMPANY_TARGET_FORBIDDEN');
    await expectError(await request.get(`/api/rh/community/posts/${ids.postB}`, rhA), 404, 'COMMUNITY_POST_NOT_FOUND');
    await expectError(await request.patch(`/api/rh/community/posts/${ids.postB}`, {
      ...rhA,
      data: { title: 'Tentativa de edicao entre tenants' },
    }), 404, 'COMMUNITY_POST_NOT_FOUND');
    await expectError(await request.patch(`/api/rh/community/posts/${ids.postB}`, {
      ...rhA,
      data: { status: 'published' },
    }), 404, 'COMMUNITY_POST_NOT_FOUND');
    await expectError(await request.patch(`/api/rh/community/posts/${ids.postB}`, {
      ...rhA,
      data: { status: 'archived' },
    }), 404, 'COMMUNITY_POST_NOT_FOUND');

    const listB = await request.get('/api/rh/community/posts?status=published', {
      headers: authHeaders(tokens.rhB),
    });
    expect(listB.status(), await listB.text()).toBe(200);
    expect(JSON.stringify(await listB.json())).toContain(COMPANY_B_SENTINEL);

    const companyAdmin = await request.get('/api/rh/community/posts?status=published', {
      headers: authHeaders(tokens.companyAdminA),
    });
    expect(companyAdmin.status(), await companyAdmin.text()).toBe(200);
    expect((await companyAdmin.json()).companyId).toBe(ids.companyA);
  });

  test('requires an explicit active company for master-admin reads and writes', async ({ request }) => {
    const master = { headers: authHeaders(tokens.master) };
    await expectError(await request.get('/api/rh/community/posts', master), 400, 'COMPANY_REQUIRED');
    await expectError(await request.post('/api/rh/community/posts', {
      ...master,
      data: editorialInput(),
    }), 400, 'COMPANY_REQUIRED');
    await expectError(await request.get(`/api/rh/community/posts?companyId=${ids.companyInactive}`, master), 404, 'COMPANY_NOT_FOUND');

    const listB = await request.get(`/api/rh/community/posts?companyId=${ids.companyB}&status=published`, master);
    expect(listB.status(), await listB.text()).toBe(200);
    const payload = await listB.json();
    expect(payload.companyId).toBe(ids.companyB);
    expect(JSON.stringify(payload)).toContain(COMPANY_B_SENTINEL);
  });

  test('lets master admin create, edit, publish, and archive only the explicitly selected company', async ({ request }) => {
    const master = { headers: authHeaders(tokens.master) };
    const created = await request.post('/api/rh/community/posts', {
      ...master,
      data: editorialInput({ companyId: ids.companyB, title: MASTER_POST_TITLE }),
    });
    expect(created.status(), await created.text()).toBe(201);
    masterEditorialPostId = (await created.json()).post.id;

    const edited = await request.patch(
      `/api/rh/community/posts/${masterEditorialPostId}?companyId=${ids.companyB}`,
      { ...master, data: { summary: 'Resumo editado pelo admin master no tenant selecionado.' } },
    );
    expect(edited.status(), await edited.text()).toBe(200);
    expect((await edited.json()).post.summary).toBe('Resumo editado pelo admin master no tenant selecionado.');

    const published = await request.patch(
      `/api/rh/community/posts/${masterEditorialPostId}?companyId=${ids.companyB}`,
      { ...master, data: { status: 'published' } },
    );
    expect(published.status(), await published.text()).toBe(200);
    expect((await published.json()).post.status).toBe('published');

    const archived = await request.patch(
      `/api/rh/community/posts/${masterEditorialPostId}?companyId=${ids.companyB}`,
      { ...master, data: { status: 'archived' } },
    );
    expect(archived.status(), await archived.text()).toBe(200);
    expect((await archived.json()).post.status).toBe('archived');

    const companyAList = await request.get('/api/rh/community/posts', {
      headers: authHeaders(tokens.dualRoleA),
    });
    expect(companyAList.status(), await companyAList.text()).toBe(200);
    expect(JSON.stringify(await companyAList.json())).not.toContain(MASTER_POST_TITLE);

    const db = openPlaywrightDatabase();
    try {
      expect((db.prepare('SELECT company_id FROM community_posts WHERE id = ?').get(masterEditorialPostId) as {
        company_id: string;
      }).company_id).toBe(ids.companyB);
      const auditRows = db.prepare(`
        SELECT actor_id, actor_email, actor_role, action, entity_id, details
        FROM audit_logs
        WHERE entity_type = 'community_post' AND entity_id = ?
        ORDER BY created_at ASC, rowid ASC
      `).all(masterEditorialPostId) as Array<{
        actor_id: string;
        actor_email: string;
        actor_role: string;
        action: string;
        entity_id: string;
        details: string;
      }>;
      expect(auditRows.map((row) => row.action)).toEqual([
        'community_post_create',
        'community_post_update',
        'community_post_publish',
        'community_post_archive',
      ]);
      for (const row of auditRows) {
        expect(row).toMatchObject({
          actor_id: 'user_admin',
          actor_email: ADMIN_EMAIL,
          actor_role: 'admin',
          entity_id: masterEditorialPostId,
        });
        expect(JSON.parse(row.details)).toMatchObject({
          companyId: ids.companyB,
          postId: masterEditorialPostId,
        });
      }
    } finally {
      db.close();
    }
  });

  test('revalidates the active persisted editorial actor before writes', async ({ request }) => {
    const db = openPlaywrightDatabase();
    try {
      db.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run(ids.dualRoleA);
    } finally {
      db.close();
    }

    try {
      await expectError(await request.post('/api/rh/community/posts', {
        headers: authHeaders(tokens.dualRoleA),
        data: editorialInput(),
      }), 403, 'EDITORIAL_ACTOR_FORBIDDEN');
    } finally {
      const restoreDb = openPlaywrightDatabase();
      try {
        restoreDb.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run(ids.dualRoleA);
      } finally {
        restoreDb.close();
      }
    }
  });

  test('fails management reads and writes closed after persisted role and company changes', async ({ request }) => {
    const options = { headers: authHeaders(tokens.dualRoleA) };
    const assertClosed = async () => {
      await expectError(await request.get('/api/rh/community/posts', options), 403, 'EDITORIAL_ACTOR_FORBIDDEN');
      await expectError(await request.post('/api/rh/community/posts', {
        ...options,
        data: editorialInput(),
      }), 403, 'EDITORIAL_ACTOR_FORBIDDEN');
    };

    const roleDb = openPlaywrightDatabase();
    try {
      roleDb.prepare("UPDATE users SET role = 'lideranca' WHERE id = ?").run(ids.dualRoleA);
    } finally {
      roleDb.close();
    }
    try {
      await assertClosed();
    } finally {
      const restoreRoleDb = openPlaywrightDatabase();
      try {
        restoreRoleDb.prepare("UPDATE users SET role = 'rh' WHERE id = ?").run(ids.dualRoleA);
      } finally {
        restoreRoleDb.close();
      }
    }

    const companyDb = openPlaywrightDatabase();
    try {
      companyDb.prepare('UPDATE users SET company_id = ? WHERE id = ?').run(ids.companyB, ids.dualRoleA);
    } finally {
      companyDb.close();
    }
    try {
      await assertClosed();
    } finally {
      const restoreCompanyDb = openPlaywrightDatabase();
      try {
        restoreCompanyDb.prepare('UPDATE users SET company_id = ? WHERE id = ?').run(ids.companyA, ids.dualRoleA);
      } finally {
        restoreCompanyDb.close();
      }
    }
  });

  test('creates safe draft and published editorial DTOs with server-owned publication time', async ({ request }) => {
    const rhA = { headers: authHeaders(tokens.dualRoleA) };
    await expectError(await request.post('/api/rh/community/posts', {
      ...rhA,
      data: editorialInput({ bodyText: '<script>alert(1)</script> conteudo editorial proibido' }),
    }), 422, 'COMMUNITY_POST_INVALID');

    const draft = await request.post('/api/rh/community/posts', {
      ...rhA,
      data: editorialInput(),
    });
    expect(draft.status(), await draft.text()).toBe(201);
    expectPrivateResponse(draft);
    const draftPayload = await draft.json();
    editorialDraftId = draftPayload.post.id;
    expect(draftPayload.post).toMatchObject({
      title: 'Pausa editorial segura',
      status: 'draft',
      publishedAt: null,
    });
    expect(Object.keys(draftPayload.post).sort()).toEqual([
      'bodyText', 'createdAt', 'expiresAt', 'id', 'imagePath', 'publishedAt',
      'readTimeMinutes', 'status', 'summary', 'title', 'topic', 'updatedAt',
    ].sort());

    const published = await request.post('/api/rh/community/posts', {
      ...rhA,
      data: editorialInput({ status: 'published', title: 'Publicacao imediata segura' }),
    });
    expect(published.status(), await published.text()).toBe(201);
    const publishedPost = (await published.json()).post;
    expect(publishedPost.status).toBe('published');
    expect(publishedPost.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('enforces ordered transitions while allowing same-status content edits', async ({ request }) => {
    const rhA = { headers: authHeaders(tokens.dualRoleA) };
    expect(editorialDraftId).toBeTruthy();

    const editedDraft = await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { title: 'Pausa editorial revisada', status: 'draft' },
    });
    expect(editedDraft.status(), await editedDraft.text()).toBe(200);
    expect((await editedDraft.json()).post.title).toBe('Pausa editorial revisada');

    await expectError(await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'archived' },
    }), 409, 'COMMUNITY_TRANSITION_INVALID');

    const published = await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'published' },
    });
    expect(published.status(), await published.text()).toBe(200);
    const firstPublishedAt = (await published.json()).post.publishedAt;
    expect(firstPublishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const editedPublished = await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { summary: 'Resumo atualizado sem alterar o instante original de publicacao.', status: 'published' },
    });
    expect(editedPublished.status(), await editedPublished.text()).toBe(200);
    expect((await editedPublished.json()).post.publishedAt).toBe(firstPublishedAt);

    await expectError(await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'draft' },
    }), 409, 'COMMUNITY_TRANSITION_INVALID');

    const archived = await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'archived' },
    });
    expect(archived.status(), await archived.text()).toBe(200);
    expect((await archived.json()).post.status).toBe('archived');
    await expectError(await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { title: 'Arquivado nao pode mais ser editado' },
    }), 409, 'COMMUNITY_TRANSITION_INVALID');
    await expectError(await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'archived' },
    }), 409, 'COMMUNITY_TRANSITION_INVALID');
    await expectError(await request.patch(`/api/rh/community/posts/${editorialDraftId}`, {
      ...rhA,
      data: { status: 'published' },
    }), 409, 'COMMUNITY_TRANSITION_INVALID');
  });

  test('defaults a missing company feed setting off, blocks publish, and isolates switch writes', async ({ request }) => {
    const requestIp = '198.51.100.77';
    const rhDisabled = {
      headers: {
        ...authHeaders(tokens.rhDisabled),
        'x-forwarded-for': `${requestIp}, 10.0.0.7`,
      },
    };
    const managementList = await request.get('/api/rh/community/posts', rhDisabled);
    expect(managementList.status(), await managementList.text()).toBe(200);
    expect(await managementList.json()).toMatchObject({
      companyId: ids.companyDisabled,
      status: null,
      settings: { companyFeedEnabled: false },
    });
    const company = await request.get('/api/company', rhDisabled);
    expect(company.status(), await company.text()).toBe(200);
    expect((await company.json()).company.feed_company_enabled).toBe(false);

    const draft = await request.post('/api/rh/community/posts', {
      ...rhDisabled,
      data: editorialInput({ title: 'Rascunho de tenant desativado' }),
    });
    expect(draft.status(), await draft.text()).toBe(201);
    const disabledDraftId = (await draft.json()).post.id;
    await expectError(await request.patch(`/api/rh/community/posts/${disabledDraftId}`, {
      ...rhDisabled,
      data: { status: 'published' },
    }), 409, 'FEED_DISABLED');

    const enabled = await request.patch('/api/company', {
      ...rhDisabled,
      data: { feedCompanyEnabled: true },
    });
    expect(enabled.status(), await enabled.text()).toBe(200);

    let firstSettingUpdatedAt = '';
    const db = openPlaywrightDatabase();
    try {
      const ownSetting = db.prepare(`
        SELECT setting_value, updated_at FROM company_settings
        WHERE company_id = ? AND setting_key = 'feed_company_enabled'
      `).get(ids.companyDisabled) as { setting_value: string; updated_at: string };
      expect(ownSetting.setting_value).toBe('1');
      expect(ownSetting.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      firstSettingUpdatedAt = ownSetting.updated_at;
      expect((db.prepare(`
        SELECT setting_value FROM company_settings
        WHERE company_id = ? AND setting_key = 'feed_company_enabled'
      `).get(ids.companyB) as { setting_value: string }).setting_value).toBe('1');
    } finally {
      db.close();
    }

    const unchanged = await request.patch('/api/company', {
      ...rhDisabled,
      data: { feedCompanyEnabled: true },
    });
    expect(unchanged.status(), await unchanged.text()).toBe(200);

    const receiptDb = openPlaywrightDatabase();
    try {
      const unchangedSetting = receiptDb.prepare(`
        SELECT setting_value, updated_at FROM company_settings
        WHERE company_id = ? AND setting_key = 'feed_company_enabled'
      `).get(ids.companyDisabled) as { setting_value: string; updated_at: string };
      expect(unchangedSetting).toEqual({ setting_value: '1', updated_at: firstSettingUpdatedAt });

      const receipts = receiptDb.prepare(`
        SELECT actor_id, actor_email, actor_role, action, entity_type, entity_id,
               details, ip, created_at
        FROM audit_logs
        WHERE action = 'company_community_feed_setting_update' AND entity_id = ?
        ORDER BY created_at ASC, rowid ASC
      `).all(ids.companyDisabled) as Array<{
        actor_id: string;
        actor_email: string;
        actor_role: string;
        action: string;
        entity_type: string;
        entity_id: string;
        details: string;
        ip: string;
        created_at: string;
      }>;
      expect(receipts).toHaveLength(1);
      expect(receipts[0]).toMatchObject({
        actor_id: ids.rhDisabled,
        actor_email: emails.rhDisabled,
        actor_role: 'rh',
        action: 'company_community_feed_setting_update',
        entity_type: 'company_setting',
        entity_id: ids.companyDisabled,
        ip: requestIp,
      });
      expect(receipts[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(JSON.parse(receipts[0].details)).toEqual({
        companyId: ids.companyDisabled,
        previous: false,
        new: true,
        timestamp: receipts[0].created_at,
      });
      expect(receipts[0].details).not.toMatch(/body|content|summary|title/i);
    } finally {
      receiptDb.close();
    }

    const published = await request.patch(`/api/rh/community/posts/${disabledDraftId}`, {
      ...rhDisabled,
      data: { status: 'published' },
    });
    expect(published.status(), await published.text()).toBe(200);
    expect((await published.json()).post.status).toBe('published');
  });

  test('records body-free audit receipts for create, update, publish, and archive', () => {
    const db = openPlaywrightDatabase();
    try {
      const rows = db.prepare(`
        SELECT actor_id, actor_email, actor_role, action, entity_id, details
        FROM audit_logs
        WHERE entity_type = 'community_post' AND entity_id = ?
        ORDER BY created_at ASC, rowid ASC
      `).all(editorialDraftId) as Array<{
        actor_id: string;
        actor_email: string;
        actor_role: string;
        action: string;
        entity_id: string;
        details: string;
      }>;
      expect(rows.map((row) => row.action)).toEqual(expect.arrayContaining([
        'community_post_create',
        'community_post_update',
        'community_post_publish',
        'community_post_archive',
      ]));
      for (const row of rows) {
        expect(row).toMatchObject({
          actor_id: ids.dualRoleA,
          actor_email: emails.dualRoleA,
          actor_role: 'rh',
          entity_id: editorialDraftId,
        });
        const details = JSON.parse(row.details);
        expect(details).toMatchObject({ companyId: ids.companyA, postId: editorialDraftId });
        expect(JSON.stringify(details)).not.toMatch(/body|summary|title|conteudo/i);
      }
    } finally {
      db.close();
    }
  });

  test('browser covers RH management states and the full editorial workflow', async ({ page, context, baseURL }) => {
    expect(baseURL).toBeTruthy();
    setCompanyFeedEnabled(ids.companyDisabled, false);
    await context.addCookies([{
      name: 'uniher-access-token',
      value: tokens.rhDisabled,
      url: baseURL!,
    }]);

    await page.goto('/comunidade/gerenciar');
    await expect(page.getByRole('heading', { name: 'Gestão editorial', exact: true })).toBeVisible();
    await expect(page.getByText('Feed da comunidade desativado', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Conteúdos da comunidade' })).toContainText('Post de feed desativado');

    const statusFilter = page.getByLabel('Filtrar por status');
    await statusFilter.selectOption('archived');
    await expect(page.getByRole('heading', { name: 'Nenhum conteúdo neste filtro' })).toBeVisible();
    await statusFilter.selectOption('all');

    await page.getByRole('button', { name: 'Novo conteúdo', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByText('Revise os campos destacados antes de continuar.', { exact: true })).toBeVisible();
    await expect(page.getByText('Use entre 3 e 120 caracteres.', { exact: true })).toBeVisible();

    const browserTitle = `Browser editorial ${RUN_ID}`;
    const editedBrowserTitle = `${browserTitle} revisado`;
    const browserSummary = 'Resumo criado no navegador para validar a gestão editorial completa.';
    const browserBody = 'Primeira linha da prévia.\nSegunda linha mantida como texto simples.';
    await page.locator('#community-post-title').fill(browserTitle);
    await page.locator('#community-post-summary').fill(browserSummary);
    await page.locator('#community-post-body').fill(browserBody);
    await expect(page.getByRole('heading', { name: 'Conferência editorial' })).toBeVisible();
    await expect(
      page
        .locator('aside[aria-labelledby="community-preview-title"]')
        .getByText(browserBody, { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByText('Rascunho criado. Agora ele pode ser publicado.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeDisabled();

    await page.locator('#community-post-title').fill(editedBrowserTitle);
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByText('Alterações salvas.', { exact: true })).toBeVisible();

    setCompanyFeedEnabled(ids.companyDisabled, true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Gestão editorial', exact: true })).toBeVisible();
    await expect(page.getByText('Feed da comunidade desativado', { exact: true })).toHaveCount(0);
    const editedPostButton = page
      .getByRole('list', { name: 'Conteúdos da comunidade' })
      .getByRole('button')
      .filter({ hasText: editedBrowserTitle });
    await expect(editedPostButton).toBeVisible();
    await editedPostButton.click();

    await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.getByText('Conteúdo publicado no feed da empresa.', { exact: true })).toBeVisible();
    await expect(page.getByText('Publicado', { exact: true }).last()).toBeVisible();

    await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await expect(page.getByText('Conteúdo arquivado e removido do feed.', { exact: true })).toBeVisible();
    await expect(statusFilter).toHaveValue('archived');
    await expect(page.getByRole('list', { name: 'Conteúdos da comunidade' })).toContainText(editedBrowserTitle);
  });

  test('browser requires master admin to select a company before loading its editorial scope', async ({ page, context, baseURL }) => {
    expect(baseURL).toBeTruthy();
    await context.addCookies([{
      name: 'uniher-access-token',
      value: tokens.master,
      url: baseURL!,
    }]);

    await page.goto('/comunidade/gerenciar');
    await expect(page.getByRole('heading', { name: 'Gestão editorial', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selecione uma empresa' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo conteúdo', exact: true })).toBeDisabled();

    const selectedCompanyResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/rh/community/posts'
        && url.searchParams.get('companyId') === ids.companyB;
    });
    await page.getByLabel('Empresa selecionada').selectOption(ids.companyB);
    const response = await selectedCompanyResponse;
    expect(response.status(), await response.text()).toBe(200);

    await expect(page.getByText(`Empresa selecionada: Community B.`, { exact: false })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Conteúdos da comunidade' })).toContainText(COMPANY_B_SENTINEL);
    await expect(page.getByRole('list', { name: 'Conteúdos da comunidade' })).not.toContainText('Pausas que cabem no dia');
    await expect(page.getByRole('button', { name: 'Novo conteúdo', exact: true })).toBeEnabled();
  });
});
