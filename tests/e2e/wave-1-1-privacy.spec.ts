import Database from 'better-sqlite3';
import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type BrowserContext,
  type Page,
  type Response as BrowserResponse,
} from '@playwright/test';

import playwrightDbSafety from '../playwright-db-safety.cjs';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const PASSWORD = 'Admin@2026';
const COMPANY_A_CANARY = 'CANARY-ANA-MAMOGRAFIA-0930';
const COLLABORATOR_B_CANARY = 'CANARY-B-CONSULTA-PRIVATE-1015';
const COMPANY_B_CANARY = 'CANARY-OTHER-TENANT';
const RUN_ID = `${Date.now()}-${process.pid}`;

const LEGACY_GAMIFICATION_TABLES = [
  'users',
  'user_leagues',
  'custom_leagues',
  'custom_league_members',
  'badges',
  'user_badges',
  'challenges',
  'user_challenges',
  'daily_missions',
  'mission_logs',
  'activity_log',
  'company_objectives',
  'user_objective_progress',
  'rewards',
  'reward_redemptions',
  'user_hearts',
  'gamification_config',
  'health_scores',
] as const;

type LegacyGamificationTable = (typeof LEGACY_GAMIFICATION_TABLES)[number];
type LegacyGamificationSnapshot = Record<LegacyGamificationTable, unknown[]>;

const ids = {
  companyA: `privacy-company-a-${RUN_ID}`,
  companyB: `privacy-company-b-${RUN_ID}`,
  hiddenDepartment: `privacy-department-hidden-${RUN_ID}`,
  visibleDepartment: `privacy-department-visible-${RUN_ID}`,
  temporalDepartment: `privacy-department-temporal-${RUN_ID}`,
  companyBDepartment: `privacy-department-b-${RUN_ID}`,
  collaboratorA: `privacy-collaborator-a-${RUN_ID}`,
  collaboratorB: `privacy-collaborator-b-${RUN_ID}`,
  rhA: `privacy-rh-a-${RUN_ID}`,
  rhB: `privacy-rh-b-${RUN_ID}`,
  leadershipA: `privacy-leadership-a-${RUN_ID}`,
  dualRoleA: `privacy-dual-role-a-${RUN_ID}`,
  adminA: `privacy-admin-a-${RUN_ID}`,
};

const emails = {
  collaboratorA: `privacy-colab-a-test-${RUN_ID}@local.invalid`,
  collaboratorB: `privacy-colab-b-test-${RUN_ID}@local.invalid`,
  rhA: `privacy-rh-a-test-${RUN_ID}@local.invalid`,
  rhB: `privacy-rh-b-test-${RUN_ID}@local.invalid`,
  leadershipA: `privacy-leadership-a-test-${RUN_ID}@local.invalid`,
  dualRoleA: `privacy-dual-role-a-test-${RUN_ID}@local.invalid`,
  adminA: `privacy-admin-a-test-${RUN_ID}@local.invalid`,
};

const cohortIds = {
  hidden: [
    ids.collaboratorA,
    ids.collaboratorB,
    ...Array.from({ length: 7 }, (_, index) => `privacy-hidden-${index}-${RUN_ID}`),
  ],
  visible: Array.from({ length: 10 }, (_, index) => `privacy-visible-${index}-${RUN_ID}`),
  temporal: Array.from({ length: 11 }, (_, index) => `privacy-temporal-${index}-${RUN_ID}`),
  companyB: Array.from({ length: 10 }, (_, index) => `privacy-company-b-${index}-${RUN_ID}`),
};

interface AuthTokens {
  admin: string;
  masterAdmin: string;
  collaboratorA: string;
  collaboratorB: string;
  rhA: string;
  rhB: string;
  leadershipA: string;
  dualRoleA: string;
}

type ProtectedMetric =
  | { status: 'visible'; value: number }
  | { status: 'suppressed'; reason: string; message?: string };

interface DashboardProjection {
  metrics: { examActivity: ProtectedMetric };
  departments: Array<{ id: string; name: string; metric: ProtectedMetric }>;
  ageDistribution: Array<{ label: string; metric: ProtectedMetric }>;
  examActivitySeries: Array<{ period: string; metric: ProtectedMetric }>;
}

let tokens: AuthTokens;
let temporalFixture: {
  currentDate: string;
  currentPeriod: string;
  previousDate: string;
  previousPeriod: string;
};

function authHeaders(token: string) {
  return { Cookie: `uniher-access-token=${token}` };
}

async function login(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password: PASSWORD },
  });
  expect(response.status(), await response.text()).toBe(200);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token).not.toBe('');
  return token;
}

function openPlaywrightDatabase(): Database.Database {
  const databasePath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
  return new Database(databasePath);
}

function seedPrivacyFixtures() {
  const db = openPlaywrightDatabase();
  try {
    const admin = db.prepare(
      'SELECT password_hash FROM users WHERE email = ?',
    ).get(ADMIN_EMAIL) as { password_hash: string } | undefined;
    if (!admin) throw new Error('Seeded Playwright admin was not found');

    const insertCompany = db.prepare(`
      INSERT INTO companies (id, name, trade_name, cnpj, sector, plan)
      VALUES (?, ?, ?, ?, 'privacy-e2e', 'enterprise')
    `);
    const insertDepartment = db.prepare(`
      INSERT INTO departments (id, company_id, name, color)
      VALUES (?, ?, ?, '#536444')
    `);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, company_id, department_id, name, email, password_hash, role,
        approved, blocked, must_change_password, also_collaborator, birth_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
    `);
    const insertExam = db.prepare(`
      INSERT INTO user_exams (id, user_id, exam_name, status, completed_date)
      VALUES (?, ?, 'Hemograma', 'completed', ?)
    `);
    const completeFirstAccess = db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES (?, 'first_access_tour_completed', '1', datetime('now'))
    `);

    const now = new Date();
    const currentMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15))
      .toISOString().slice(0, 10);
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
      .toISOString().slice(0, 10);
    temporalFixture = {
      currentDate: currentMonth,
      currentPeriod: currentMonth.slice(0, 7),
      previousDate: previousMonth,
      previousPeriod: previousMonth.slice(0, 7),
    };

    db.transaction(() => {
      insertCompany.run(ids.companyA, `Privacy Company A ${RUN_ID}`, 'Privacy Company A', `91${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);
      insertCompany.run(ids.companyB, `Privacy Company B ${RUN_ID}`, 'Privacy Company B', `92${RUN_ID.replace(/\D/g, '').slice(-12).padStart(12, '0')}`);
      insertDepartment.run(ids.hiddenDepartment, ids.companyA, `Hidden ${COMPANY_A_CANARY}`);
      insertDepartment.run(ids.visibleDepartment, ids.companyA, 'Visible cohort');
      insertDepartment.run(ids.temporalDepartment, ids.companyA, 'Temporal stable-nine cohort');
      insertDepartment.run(ids.companyBDepartment, ids.companyB, COMPANY_B_CANARY);

      insertUser.run(ids.collaboratorA, ids.companyA, ids.hiddenDepartment, 'Privacy Collaborator A', emails.collaboratorA, admin.password_hash, 'colaboradora', 0, '1990-01-01');
      insertUser.run(ids.collaboratorB, ids.companyA, ids.hiddenDepartment, 'Privacy Collaborator B', emails.collaboratorB, admin.password_hash, 'colaboradora', 0, '1990-01-01');
      insertUser.run(ids.rhA, ids.companyA, null, 'Privacy RH A', emails.rhA, admin.password_hash, 'rh', 0, null);
      insertUser.run(ids.rhB, ids.companyB, null, 'Privacy RH B', emails.rhB, admin.password_hash, 'rh', 0, null);
      insertUser.run(ids.leadershipA, ids.companyA, null, 'Privacy Leadership A', emails.leadershipA, admin.password_hash, 'lideranca', 0, null);
      insertUser.run(ids.dualRoleA, ids.companyA, null, 'Privacy Dual Role A', emails.dualRoleA, admin.password_hash, 'rh', 1, null);
      insertUser.run(ids.adminA, ids.companyA, null, 'Privacy Admin A', emails.adminA, admin.password_hash, 'admin', 0, null);
      completeFirstAccess.run(ids.rhA);
      completeFirstAccess.run(ids.rhB);

      const legacyBadgeId = `privacy-legacy-badge-${RUN_ID}`;
      const legacyChallengeId = `privacy-legacy-challenge-${RUN_ID}`;
      const legacyLeagueId = `privacy-legacy-league-${RUN_ID}`;
      const legacyRewardId = `privacy-legacy-reward-${RUN_ID}`;
      const legacyObjectiveId = `privacy-legacy-objective-${RUN_ID}`;
      db.prepare(`
        INSERT INTO user_leagues (id, user_id, league, week_points, week_start)
        VALUES (?, ?, 'ouro', 77, '2026-07-13')
      `).run(`privacy-legacy-user-league-${RUN_ID}`, ids.collaboratorA);
      db.prepare(`
        INSERT INTO custom_leagues (id, company_id, name, type, created_by)
        VALUES (?, ?, 'Legacy privacy league', 'opt_in', ?)
      `).run(legacyLeagueId, ids.companyA, ids.rhA);
      db.prepare(`
        INSERT INTO custom_league_members (id, league_id, user_id, week_points, week_start)
        VALUES (?, ?, ?, 66, '2026-07-13')
      `).run(`privacy-legacy-member-${RUN_ID}`, legacyLeagueId, ids.collaboratorA);
      db.prepare(`
        INSERT INTO badges (id, name, description, icon, points)
        VALUES (?, 'Legacy badge', 'Privacy sentinel', 'shield', 55)
      `).run(legacyBadgeId);
      db.prepare(`
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (?, ?)
      `).run(ids.collaboratorA, legacyBadgeId);
      db.prepare(`
        INSERT INTO challenges (
          id, title, description, category, points, total_steps, company_id, created_by
        ) VALUES (?, 'Legacy challenge', 'Privacy sentinel', 'privacy', 44, 1, ?, ?)
      `).run(legacyChallengeId, ids.companyA, ids.rhA);
      db.prepare(`
        INSERT INTO user_challenges (user_id, challenge_id, progress, status)
        VALUES (?, ?, 1, 'active')
      `).run(ids.collaboratorA, legacyChallengeId);
      db.prepare(`
        INSERT INTO daily_missions (id, user_id, title, xp, category, action, day)
        VALUES (?, ?, 'Legacy mission', 33, 'privacy', 'legacy_probe', '2026-07-16')
      `).run(`privacy-legacy-mission-${RUN_ID}`, ids.collaboratorA);
      db.prepare(`
        INSERT INTO mission_logs (id, user_id, mission_id, action, day, note)
        VALUES (?, ?, ?, 'legacy_probe', '2026-07-16', 'privacy sentinel')
      `).run(
        `privacy-legacy-mission-log-${RUN_ID}`,
        ids.collaboratorA,
        `privacy-legacy-mission-${RUN_ID}`,
      );
      db.prepare(`
        INSERT INTO activity_log (id, user_id, action, points_earned)
        VALUES (?, ?, 'legacy_probe', 22)
      `).run(`privacy-legacy-activity-${RUN_ID}`, ids.collaboratorA);
      db.prepare(`
        INSERT INTO company_objectives (
          id, company_id, title, type, target_type, target_value,
          reward_type, reward_points, created_by
        ) VALUES (?, ?, 'Legacy objective', 'goal', 'points', 10, 'points', 11, ?)
      `).run(legacyObjectiveId, ids.companyA, ids.rhA);
      db.prepare(`
        INSERT INTO user_objective_progress (
          id, user_id, objective_id, current_value, completed, reward_claimed
        ) VALUES (?, ?, ?, 4, 0, 0)
      `).run(`privacy-legacy-objective-progress-${RUN_ID}`, ids.collaboratorA, legacyObjectiveId);
      db.prepare(`
        INSERT INTO rewards (id, company_id, title, points_cost, quantity_available)
        VALUES (?, ?, 'Legacy reward', 99, 1)
      `).run(legacyRewardId, ids.companyA);
      db.prepare(`
        INSERT INTO reward_redemptions (id, user_id, reward_id, points_spent, status)
        VALUES (?, ?, ?, 99, 'pending')
      `).run(`privacy-legacy-redemption-${RUN_ID}`, ids.collaboratorA, legacyRewardId);
      db.prepare(`
        INSERT INTO user_hearts (user_id, hearts, max_hearts)
        VALUES (?, 3, 5)
      `).run(ids.collaboratorA);
      db.prepare(`
        INSERT INTO gamification_config (company_id, xp_checkin, league_enabled)
        VALUES (?, 88, 1)
      `).run(ids.companyA);
      db.prepare(`
        INSERT INTO health_scores (id, user_id, dimension, score, status, recorded_at)
        VALUES (?, ?, 'Legacy privacy score', 77, 'yellow', '2026-07-16T08:00:00.000Z')
      `).run(`privacy-legacy-health-score-${RUN_ID}`, ids.collaboratorA);

      for (const [index, userId] of cohortIds.hidden.slice(2).entries()) {
        insertUser.run(userId, ids.companyA, ids.hiddenDepartment, `Hidden contributor ${index}`, `privacy-hidden-test-${index}-${RUN_ID}@local.invalid`, admin.password_hash, 'colaboradora', 0, '1990-01-01');
      }
      for (const [index, userId] of cohortIds.visible.entries()) {
        insertUser.run(userId, ids.companyA, ids.visibleDepartment, `Visible contributor ${index}`, `privacy-visible-test-${index}-${RUN_ID}@local.invalid`, admin.password_hash, 'colaboradora', 0, '1988-01-01');
      }
      for (const [index, userId] of cohortIds.temporal.entries()) {
        insertUser.run(userId, ids.companyA, ids.temporalDepartment, `Temporal contributor ${index}`, `privacy-temporal-test-${index}-${RUN_ID}@local.invalid`, admin.password_hash, 'colaboradora', 0, '1986-01-01');
      }
      for (const [index, userId] of cohortIds.companyB.entries()) {
        insertUser.run(userId, ids.companyB, ids.companyBDepartment, `Company B contributor ${index}`, `privacy-company-b-test-${index}-${RUN_ID}@local.invalid`, admin.password_hash, 'colaboradora', 0, '1992-01-01');
      }

      for (const userId of cohortIds.hidden) {
        insertExam.run(`privacy-exam-hidden-${userId}`, userId, currentMonth);
      }
      for (const userId of cohortIds.visible) {
        insertExam.run(`privacy-exam-visible-${userId}`, userId, currentMonth);
      }
      for (const userId of cohortIds.temporal.slice(0, 10)) {
        insertExam.run(`privacy-exam-temporal-previous-${userId}`, userId, previousMonth);
      }
      for (const userId of [...cohortIds.temporal.slice(0, 9), cohortIds.temporal[10]]) {
        insertExam.run(`privacy-exam-temporal-current-${userId}`, userId, currentMonth);
      }
    })();
  } finally {
    db.close();
  }
}

function cleanupPrivacyFixtures() {
  const db = openPlaywrightDatabase();
  try {
    db.pragma('foreign_keys = OFF');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>;
    for (const { name } of tables) {
      if (['users', 'departments', 'companies'].includes(name)) continue;
      const quotedName = `"${name.replace(/"/g, '""')}"`;
      const columns = db.prepare(`PRAGMA table_info(${quotedName})`).all() as Array<{ name: string }>;
      const columnNames = new Set(columns.map(column => column.name));
      if (columnNames.has('id')) {
        db.prepare(`DELETE FROM ${quotedName} WHERE id LIKE ?`).run(`%${RUN_ID}`);
      }
      if (columnNames.has('user_id')) {
        db.prepare(`DELETE FROM ${quotedName} WHERE user_id LIKE ?`).run(`%${RUN_ID}`);
      }
      if (columnNames.has('company_id')) {
        db.prepare(`DELETE FROM ${quotedName} WHERE company_id IN (?, ?)`).run(ids.companyA, ids.companyB);
      }
    }
    db.prepare('DELETE FROM users WHERE id LIKE ?').run(`%${RUN_ID}`);
    db.prepare('DELETE FROM departments WHERE company_id IN (?, ?)').run(ids.companyA, ids.companyB);
    db.prepare('DELETE FROM companies WHERE id IN (?, ?)').run(ids.companyA, ids.companyB);
    db.pragma('foreign_keys = ON');
  } finally {
    db.close();
  }
}

function expectPrivateResponse(response: APIResponse) {
  expect(response.headers()['cache-control']).toBe('private, no-store');
  const varyTokens = (response.headers().vary ?? '')
    .split(',')
    .map(token => token.trim().toLowerCase());
  expect(varyTokens).toContain('cookie');
}

async function expectPrivateBrowserResponse(response: BrowserResponse) {
  const headers = await response.allHeaders();
  expect(headers['cache-control']).toBe('private, no-store');
  const varyTokens = (headers.vary ?? '')
    .split(',')
    .map(token => token.trim().toLowerCase());
  expect(varyTokens).toContain('cookie');
}

async function expectPrivacyUnavailable(response: APIResponse) {
  expect(response.status(), await response.text()).toBe(410);
  expectPrivateResponse(response);
  const payload = await response.json() as Record<string, unknown>;
  expect(payload.status).toBe('unavailable');
  expect(payload.reason).toBe('privacy_review');
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toContain(COMPANY_A_CANARY);
  expect(serialized).not.toContain(COMPANY_B_CANARY);
  expect(serialized).not.toContain(ids.companyA);
  expect(serialized).not.toContain(ids.collaboratorA);
}

function latestActiveAgendaEventId(userId: string): string {
  const db = openPlaywrightDatabase();
  try {
    const event = db.prepare(`
      SELECT id FROM health_events
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `).get(userId) as { id: string } | undefined;
    if (!event) throw new Error(`No active Agenda event for ${userId}`);
    return event.id;
  } finally {
    db.close();
  }
}

function healthScoreSnapshot(userId: string): string {
  const db = openPlaywrightDatabase();
  try {
    const rows = db.prepare(`
      SELECT id, dimension, score, status, recorded_at
      FROM health_scores
      WHERE user_id = ?
      ORDER BY id
    `).all(userId);
    return JSON.stringify(rows);
  } finally {
    db.close();
  }
}

function legacyGamificationSnapshot(): LegacyGamificationSnapshot {
  const db = openPlaywrightDatabase();
  try {
    const entries = LEGACY_GAMIFICATION_TABLES.map((table) => {
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>;
      expect(columns.length, `${table} must exist in the Playwright schema`).toBeGreaterThan(0);
      const columnNames = new Set(columns.map(column => column.name));
      let predicate: string;
      let params: string[];
      if (table === 'users') {
        predicate = 'id LIKE ?';
        params = [`%${RUN_ID}`];
      } else if (columnNames.has('user_id')) {
        predicate = 'user_id LIKE ?';
        params = [`%${RUN_ID}`];
      } else if (columnNames.has('company_id')) {
        predicate = 'company_id IN (?, ?)';
        params = [ids.companyA, ids.companyB];
      } else {
        predicate = 'id LIKE ?';
        params = [`%${RUN_ID}`];
      }
      const rows = db.prepare(`
        SELECT * FROM "${table}"
        WHERE ${predicate}
        ORDER BY rowid
      `).all(...params);
      return [table, rows] as const;
    });
    return Object.fromEntries(entries) as LegacyGamificationSnapshot;
  } finally {
    db.close();
  }
}

function temporalCohortEvidence() {
  const db = openPlaywrightDatabase();
  try {
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', ue.completed_date) AS period, ue.user_id
      FROM user_exams ue
      JOIN users u ON u.id = ue.user_id
      WHERE u.department_id = ?
        AND ue.status = 'completed'
        AND strftime('%Y-%m', ue.completed_date) IN (?, ?)
      GROUP BY period, ue.user_id
      ORDER BY period, ue.user_id
    `).all(
      ids.temporalDepartment,
      temporalFixture.previousPeriod,
      temporalFixture.currentPeriod,
    ) as Array<{ period: string; user_id: string }>;
    const previousParticipants = new Set(
      rows
        .filter(row => row.period === temporalFixture.previousPeriod)
        .map(row => row.user_id),
    );
    const currentParticipants = new Set(
      rows
        .filter(row => row.period === temporalFixture.currentPeriod)
        .map(row => row.user_id),
    );
    const stableParticipants = [...previousParticipants]
      .filter(userId => currentParticipants.has(userId));
    return {
      previousCount: previousParticipants.size,
      currentCount: currentParticipants.size,
      stableCount: stableParticipants.length,
    };
  } finally {
    db.close();
  }
}

async function setBrowserToken(
  context: BrowserContext,
  baseURL: string,
  token: string,
) {
  await context.clearCookies({ name: 'uniher-access-token' });
  await context.addCookies([{
    name: 'uniher-access-token',
    value: token,
    url: baseURL,
  }]);
}

test.describe('Wave 1.1 privacy promotion gate', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    seedPrivacyFixtures();
    tokens = {
      admin: await login(request, emails.adminA),
      masterAdmin: await login(request, ADMIN_EMAIL),
      collaboratorA: await login(request, emails.collaboratorA),
      collaboratorB: await login(request, emails.collaboratorB),
      rhA: await login(request, emails.rhA),
      rhB: await login(request, emails.rhB),
      leadershipA: await login(request, emails.leadershipA),
      dualRoleA: await login(request, emails.dualRoleA),
    };
  });

  test.afterAll(() => cleanupPrivacyFixtures());

  test('collaborators can CRUD only their own Agenda events', async ({ request }) => {
    const createdA = await request.post('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorA),
      data: {
        title: COMPANY_A_CANARY,
        type: 'exame',
        date: '2026-12-20',
        time: '09:30',
        notes: 'self-owned reminder',
      },
    });
    expect(createdA.status(), await createdA.text()).toBe(200);
    expectPrivateResponse(createdA);
    const eventA = await createdA.json() as { id: string };

    const patchedA = await request.patch(`/api/collaborator/agenda/${eventA.id}`, {
      headers: authHeaders(tokens.collaboratorA),
      data: { notes: 'updated by owner' },
    });
    expect(patchedA.status(), await patchedA.text()).toBe(200);
    expectPrivateResponse(patchedA);

    for (const method of ['patch', 'delete'] as const) {
      const response = method === 'patch'
        ? await request.patch(`/api/collaborator/agenda/${eventA.id}`, {
            headers: authHeaders(tokens.collaboratorB),
            data: { notes: 'cross-user write must be hidden' },
          })
        : await request.delete(`/api/collaborator/agenda/${eventA.id}`, {
            headers: authHeaders(tokens.collaboratorB),
          });
      expect(response.status(), `${method} must conceal cross-user ownership`).toBe(404);
      expectPrivateResponse(response);
    }

    const listedA = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(listedA.status(), await listedA.text()).toBe(200);
    expectPrivateResponse(listedA);
    expect(await listedA.text()).toContain(COMPANY_A_CANARY);
    expect(await listedA.text()).not.toContain(COLLABORATOR_B_CANARY);

    const deletedA = await request.delete(`/api/collaborator/agenda/${eventA.id}`, {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(deletedA.status(), await deletedA.text()).toBe(200);
    expectPrivateResponse(deletedA);

    const createdB = await request.post('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorB),
      data: {
        title: COLLABORATOR_B_CANARY,
        type: 'consulta',
        date: '2026-12-21',
        time: '10:00',
      },
    });
    expect(createdB.status(), await createdB.text()).toBe(200);
    expectPrivateResponse(createdB);
    const eventB = await createdB.json() as { id: string };
    for (const method of ['patch', 'delete'] as const) {
      const response = method === 'patch'
        ? await request.patch(`/api/collaborator/agenda/${eventB.id}`, {
            headers: authHeaders(tokens.collaboratorA),
            data: { title: 'Cross-user overwrite' },
          })
        : await request.delete(`/api/collaborator/agenda/${eventB.id}`, {
            headers: authHeaders(tokens.collaboratorA),
          });
      expect(response.status(), `${method} must conceal collaborator B's event`).toBe(404);
      expectPrivateResponse(response);
    }

    const isolatedA = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(isolatedA.status(), await isolatedA.text()).toBe(200);
    expectPrivateResponse(isolatedA);
    expect(await isolatedA.text()).not.toContain(COLLABORATOR_B_CANARY);
    const listedB = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorB),
    });
    expect(listedB.status(), await listedB.text()).toBe(200);
    expectPrivateResponse(listedB);
    expect(await listedB.text()).toContain(COLLABORATOR_B_CANARY);
  });

  test('manager Agenda surfaces are gone and persisted capability is required', async ({ request }) => {
    for (const token of [tokens.rhA, tokens.leadershipA, tokens.admin]) {
      const agenda = await request.get('/api/rh/agenda', { headers: authHeaders(token) });
      expect(agenda.status(), await agenda.text()).toBe(410);
      expectPrivateResponse(agenda);
      expect(await agenda.text()).not.toMatch(/CANARY-/);
      expect(await agenda.text()).not.toContain(COLLABORATOR_B_CANARY);

      const preferences = await request.get('/api/rh/alert-preferences', {
        headers: authHeaders(token),
      });
      expect(preferences.status(), await preferences.text()).toBe(410);
      expectPrivateResponse(preferences);

      const preferencesPatch = await request.patch('/api/rh/alert-preferences', {
        headers: authHeaders(token),
        data: { enabled: true },
      });
      expect(preferencesPatch.status(), await preferencesPatch.text()).toBe(410);
      expectPrivateResponse(preferencesPatch);

      const collaboratorAgenda = await request.get('/api/collaborator/agenda', {
        headers: authHeaders(token),
      });
      expect(collaboratorAgenda.status(), await collaboratorAgenda.text()).toBe(403);
      expectPrivateResponse(collaboratorAgenda);

      const reminderAction = await request.post('/api/notifications/reminder-action', {
        headers: authHeaders(token),
        data: { notificationId: 'not-owned', action: 'complete' },
      });
      expect(reminderAction.status(), await reminderAction.text()).toBe(403);
      expectPrivateResponse(reminderAction);
    }

    const dualList = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.dualRoleA),
    });
    expect(dualList.status(), await dualList.text()).toBe(200);
    expectPrivateResponse(dualList);
    expect(await dualList.text()).not.toContain(COLLABORATOR_B_CANARY);

    const dualEvent = await request.post('/api/collaborator/agenda', {
      headers: authHeaders(tokens.dualRoleA),
      data: {
        title: 'Dual-role own event',
        type: 'lembrete',
        date: '2026-12-22',
        time: '11:00',
      },
    });
    expect(dualEvent.status(), await dualEvent.text()).toBe(200);
    expectPrivateResponse(dualEvent);
    const dualEventId = (await dualEvent.json() as { id: string }).id;
    const dualOwnPatch = await request.patch(`/api/collaborator/agenda/${dualEventId}`, {
      headers: authHeaders(tokens.dualRoleA),
      data: { notes: 'owned by dual-role actor' },
    });
    expect(dualOwnPatch.status(), await dualOwnPatch.text()).toBe(200);
    expectPrivateResponse(dualOwnPatch);

    const collaboratorBEventId = latestActiveAgendaEventId(ids.collaboratorB);
    const dualCrossPatch = await request.patch(`/api/collaborator/agenda/${collaboratorBEventId}`, {
      headers: authHeaders(tokens.dualRoleA),
      data: { notes: 'must remain isolated' },
    });
    expect(dualCrossPatch.status(), await dualCrossPatch.text()).toBe(404);
    expectPrivateResponse(dualCrossPatch);
  });

  test('manager notifications and exports never disclose collaborator Agenda payloads', async ({ request }) => {
    for (const token of [tokens.rhA, tokens.leadershipA, tokens.admin]) {
      const notifications = await request.get('/api/notifications', {
        headers: authHeaders(token),
      });
      expect(notifications.status(), await notifications.text()).toBe(200);
      expectPrivateResponse(notifications);
      const notificationPayload = await notifications.text();
      expect(notificationPayload).not.toContain(COMPANY_A_CANARY);
      expect(notificationPayload).not.toContain(COLLABORATOR_B_CANARY);
      expect(notificationPayload).not.toContain(COMPANY_B_CANARY);

      const exported = await request.get('/api/users/me/export', {
        headers: authHeaders(token),
      });
      expect(exported.status(), await exported.text()).toBe(200);
      expectPrivateResponse(exported);
      const exportPayload = await exported.text();
      expect(exportPayload).not.toContain(COMPANY_A_CANARY);
      expect(exportPayload).not.toContain(COLLABORATOR_B_CANARY);
      expect(exportPayload).not.toContain(COMPANY_B_CANARY);
    }

    const collaboratorNotifications = await request.get('/api/notifications', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(collaboratorNotifications.status(), await collaboratorNotifications.text()).toBe(200);
    expectPrivateResponse(collaboratorNotifications);
    const collaboratorNotificationPayload = await collaboratorNotifications.text();
    expect(collaboratorNotificationPayload).toContain(COMPANY_A_CANARY);
    expect(collaboratorNotificationPayload).not.toContain(COLLABORATOR_B_CANARY);
    expect(collaboratorNotificationPayload).not.toContain(COMPANY_B_CANARY);

    const collaboratorExport = await request.get('/api/users/me/export', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(collaboratorExport.status(), await collaboratorExport.text()).toBe(200);
    expectPrivateResponse(collaboratorExport);
    const collaboratorExportPayload = await collaboratorExport.text();
    expect(collaboratorExportPayload).toContain(COMPANY_A_CANARY);
    expect(collaboratorExportPayload).not.toContain(COLLABORATOR_B_CANARY);
    expect(collaboratorExportPayload).not.toContain(COMPANY_B_CANARY);

    const dualNotifications = await request.get('/api/notifications', {
      headers: authHeaders(tokens.dualRoleA),
    });
    expect(dualNotifications.status(), await dualNotifications.text()).toBe(200);
    expectPrivateResponse(dualNotifications);
    const dualNotificationPayload = await dualNotifications.text();
    expect(dualNotificationPayload).not.toContain(COLLABORATOR_B_CANARY);
    const dualExport = await request.get('/api/users/me/export', {
      headers: authHeaders(tokens.dualRoleA),
    });
    expect(dualExport.status(), await dualExport.text()).toBe(200);
    expectPrivateResponse(dualExport);
    expect(await dualExport.text()).not.toContain(COLLABORATOR_B_CANARY);
  });

  test('all gamification reads and mutations expose only the neutral unavailable state', async ({ request }) => {
    test.setTimeout(120_000);
    const legacyBefore = legacyGamificationSnapshot();
    for (const table of LEGACY_GAMIFICATION_TABLES) {
      expect(
        legacyBefore[table].length,
        `${table} snapshot must contain a seeded legacy sentinel`,
      ).toBeGreaterThan(0);
    }
    const collaboratorReads = [
      '/api/gamification/league',
      '/api/gamification/leaderboard',
      '/api/collaborator/leagues',
      '/api/badges',
      '/api/collaborator/badges',
      '/api/objectives',
      '/api/gamification/rewards',
      '/api/gamification/rewards/redemptions',
    ];
    for (const path of collaboratorReads) {
      await expectPrivacyUnavailable(await request.get(path, {
        headers: authHeaders(tokens.collaboratorA),
      }));
    }

    const safeChallenges = await request.get('/api/collaborator/challenges', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(safeChallenges.status(), await safeChallenges.text()).toBe(200);
    expectPrivateResponse(safeChallenges);
    const safeChallengesPayload = await safeChallenges.json() as Record<string, unknown>;
    expect(Object.keys(safeChallengesPayload).sort()).toEqual(['catalog', 'challenges']);
    expect(JSON.stringify(safeChallengesPayload)).toMatch(/sem pontuacao ou ranking/i);
    expect(JSON.stringify(safeChallengesPayload)).not.toMatch(/points|leaderboard|xp|reward|user_id|company_id|health_scores/i);
    const challengeCatalog = safeChallengesPayload.catalog as Array<{ key: string; isActive: boolean }>;
    const safeCatalogKey = challengeCatalog.find(item => item.isActive)?.key ?? challengeCatalog[0]?.key;
    expect(safeCatalogKey).toBeTruthy();

    const joinedChallenge = await request.post('/api/collaborator/challenges', {
      headers: authHeaders(tokens.collaboratorA),
      data: { catalogKey: safeCatalogKey },
    });
    expect(joinedChallenge.status(), await joinedChallenge.text()).toBe(201);
    expectPrivateResponse(joinedChallenge);
    const joinedPayload = await joinedChallenge.json() as { challenge: { id: string } };
    expect(Object.keys(joinedPayload).sort()).toEqual(['challenge']);
    expect(JSON.stringify(joinedPayload)).not.toMatch(/points|leaderboard|xp|reward|user_id|company_id|health_scores/i);
    expect(joinedPayload.challenge.id).toBeTruthy();

    const patchedChallenge = await request.patch(`/api/collaborator/challenges/${joinedPayload.challenge.id}`, {
      headers: authHeaders(tokens.collaboratorA),
      data: { action: 'progress', progress: 25 },
    });
    expect(patchedChallenge.status(), await patchedChallenge.text()).toBe(200);
    expectPrivateResponse(patchedChallenge);
    const patchedPayload = await patchedChallenge.json() as { challenge: { progress: number } };
    expect(patchedPayload.challenge.progress).toBe(25);
    expect(JSON.stringify(patchedPayload)).not.toMatch(/points|leaderboard|xp|reward|user_id|company_id|health_scores/i);

    const managerReads = [
      ['/api/rh/leagues', tokens.rhA],
      ['/api/rh/challenges', tokens.rhA],
      ['/api/rh/objectives', tokens.rhA],
      ['/api/admin/badges', tokens.masterAdmin],
    ] as const;
    for (const [path, token] of managerReads) {
      await expectPrivacyUnavailable(await request.get(path, { headers: authHeaders(token) }));
    }

    const mutations = [
      { path: '/api/gamification/rewards/redeem', method: 'POST', token: tokens.collaboratorA },
      { path: '/api/gamification/rewards/redemptions', method: 'PATCH', token: tokens.collaboratorA },
      { path: '/api/objectives/not-real/claim', method: 'POST', token: tokens.collaboratorA },
      { path: '/api/rh/leagues', method: 'POST', token: tokens.rhA },
      { path: '/api/rh/leagues/not-real', method: 'PATCH', token: tokens.rhA },
      { path: '/api/rh/leagues/not-real', method: 'DELETE', token: tokens.rhA },
      { path: '/api/rh/challenges', method: 'POST', token: tokens.rhA },
      { path: '/api/rh/challenges/not-real', method: 'PATCH', token: tokens.rhA },
      { path: '/api/rh/challenges/not-real', method: 'DELETE', token: tokens.rhA },
      { path: '/api/rh/objectives', method: 'POST', token: tokens.rhA },
      { path: '/api/rh/objectives/not-real', method: 'PATCH', token: tokens.rhA },
      { path: '/api/rh/objectives/not-real', method: 'DELETE', token: tokens.rhA },
      { path: '/api/gamification/rewards', method: 'POST', token: tokens.rhA },
      { path: '/api/admin/badges', method: 'POST', token: tokens.masterAdmin },
      { path: '/api/admin/badges/not-real', method: 'PATCH', token: tokens.masterAdmin },
      { path: '/api/admin/badges/not-real', method: 'DELETE', token: tokens.masterAdmin },
    ] as const;
    for (const mutation of mutations) {
      const response = await request.fetch(mutation.path, {
        method: mutation.method,
        headers: authHeaders(mutation.token),
        data: { id: 'not-real', title: 'must-not-write' },
      });
      await expectPrivacyUnavailable(response);
    }
    expect(legacyGamificationSnapshot()).toEqual(legacyBefore);
  });

  test('Semaforo is private self-report and every formerly connected writer leaves health_scores unchanged', async ({ request }) => {
    const reviewReads = [
      '/api/collaborator/semaforo',
      '/api/collaborator/semaforo/history',
    ];
    for (const path of reviewReads) {
      const response = await request.get(path, { headers: authHeaders(tokens.collaboratorA) });
      expect(response.status(), await response.text()).toBe(200);
      expectPrivateResponse(response);
      const payload = await response.json() as { status: string; diagnostic?: boolean; companyVisible?: boolean };
      expect(payload.status).toBe(path.endsWith('/history') ? 'private_self_report_history' : 'private_self_report');
      expect(payload.diagnostic).toBe(false);
      expect(payload.companyVisible).toBe(false);
      expect(JSON.stringify(payload)).not.toMatch(/health_scores|score|company_id|user_id/i);
    }

    const before = healthScoreSnapshot(ids.collaboratorA);
    expect(JSON.parse(before)).toHaveLength(1);
    const recalculate = await request.post('/api/collaborator/semaforo/recalculate', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(recalculate.status(), await recalculate.text()).toBe(423);
    expectPrivateResponse(recalculate);
    expect(healthScoreSnapshot(ids.collaboratorA)).toBe(before);

    const writerProbes = [
      {
        path: '/api/quiz',
        data: { archetypeKey: 'guardia', answers: [1, 2, 3, 4, 5, 6] },
        statuses: [200],
      },
      {
        path: '/api/quiz/submit',
        data: { archetypeKey: 'guardia', answers: [1, 2, 3, 4, 5, 6] },
        statuses: [200],
      },
      {
        path: '/api/gamification/check-in',
        data: undefined,
        statuses: [200, 429],
      },
      {
        path: '/api/collaborator/exams',
        data: { exam_name: 'Hemograma', completed_date: '2026-07-16' },
        statuses: [200],
      },
    ];
    for (const writer of writerProbes) {
      const response = await request.post(writer.path, {
        headers: authHeaders(tokens.collaboratorA),
        ...(writer.data === undefined ? {} : { data: writer.data }),
      });
      expect(writer.statuses, `${writer.path}: ${await response.text()}`).toContain(response.status());
      expectPrivateResponse(response);
      expect(healthScoreSnapshot(ids.collaboratorA)).toBe(before);
    }
  });

  test('dashboard protects minimum, complementary and temporal cohorts against reconstruction', async ({ request }) => {
    const hiddenPath = `/api/dashboard?period=1m&departmentId=${ids.hiddenDepartment}`;
    const visiblePath = `/api/dashboard?period=1m&departmentId=${ids.visibleDepartment}`;
    const hidden = await request.get(hiddenPath, { headers: authHeaders(tokens.rhA) });
    const visible = await request.get(visiblePath, { headers: authHeaders(tokens.rhA) });
    expect(hidden.status(), await hidden.text()).toBe(200);
    expect(visible.status(), await visible.text()).toBe(200);
    expectPrivateResponse(hidden);
    expectPrivateResponse(visible);
    const hiddenProjection = await hidden.json() as DashboardProjection;
    const visibleProjection = await visible.json() as DashboardProjection;
    expect(hiddenProjection.metrics.examActivity).toMatchObject({
      status: 'suppressed',
      reason: 'minimum_cohort',
    });
    expect(hiddenProjection.metrics.examActivity).not.toHaveProperty('value');
    expect(visibleProjection.metrics.examActivity).toMatchObject({ status: 'visible', value: 10 });
    const temporalCurrentResponse = await request.get(
      `/api/dashboard?period=1m&departmentId=${ids.temporalDepartment}`,
      { headers: authHeaders(tokens.rhA) },
    );
    expect(temporalCurrentResponse.status(), await temporalCurrentResponse.text()).toBe(200);
    expectPrivateResponse(temporalCurrentResponse);
    const temporalCurrentProjection = await temporalCurrentResponse.json() as DashboardProjection;
    expect(temporalCurrentProjection.metrics.examActivity).toMatchObject({
      status: 'visible',
      value: 10,
    });

    const overallBefore = await request.get('/api/dashboard?period=1m', {
      headers: authHeaders(tokens.rhA),
    });
    expect(overallBefore.status(), await overallBefore.text()).toBe(200);
    expectPrivateResponse(overallBefore);
    const overallProjection = await overallBefore.json() as DashboardProjection;
    const hiddenDepartment = overallProjection.departments.find(
      department => department.id === ids.hiddenDepartment,
    );
    expect(overallProjection.metrics.examActivity).toMatchObject({
      status: 'suppressed',
      reason: 'complementary',
    });
    expect(overallProjection.metrics.examActivity).not.toHaveProperty('value');
    expect(hiddenDepartment?.metric.status).toBe('suppressed');
    expect(hiddenDepartment?.metric).not.toHaveProperty('value');
    const knownFilteredAddends = [
      visibleProjection.metrics.examActivity,
      temporalCurrentProjection.metrics.examActivity,
    ];
    expect(knownFilteredAddends.every(metric => metric.status === 'visible')).toBe(true);
    expect(
      knownFilteredAddends.reduce(
        (total, metric) => total + (metric.status === 'visible' ? metric.value : 0),
        0,
      ),
    ).toBe(20);
    expect(
      'value' in overallProjection.metrics.examActivity
        ? overallProjection.metrics.examActivity.value
        : undefined,
      'company total must remain unknown so hidden = total - known departments is impossible',
    ).toBeUndefined();

    const hiddenReordered = await request.get(
      `/api/dashboard?departmentId=${ids.hiddenDepartment}&period=1m`,
      { headers: authHeaders(tokens.rhA) },
    );
    expect(hiddenReordered.status(), await hiddenReordered.text()).toBe(200);
    expectPrivateResponse(hiddenReordered);
    expect(await hiddenReordered.json()).toEqual(hiddenProjection);

    const overallAfter = await request.get('/api/dashboard?period=1m', {
      headers: authHeaders(tokens.rhA),
    });
    expect(overallAfter.status(), await overallAfter.text()).toBe(200);
    expectPrivateResponse(overallAfter);
    expect(await overallAfter.json()).toEqual(overallProjection);
    expect(JSON.stringify(overallProjection)).not.toContain('"value":9');

    expect(temporalFixture.currentDate.slice(0, 7)).toBe(temporalFixture.currentPeriod);
    expect(temporalFixture.previousDate.slice(0, 7)).toBe(temporalFixture.previousPeriod);
    expect(temporalCohortEvidence()).toEqual({
      previousCount: 10,
      currentCount: 10,
      stableCount: 9,
    });
    const temporal = await request.get(
      `/api/dashboard?period=3m&departmentId=${ids.temporalDepartment}`,
      { headers: authHeaders(tokens.rhA) },
    );
    expect(temporal.status(), await temporal.text()).toBe(200);
    expectPrivateResponse(temporal);
    const temporalProjection = await temporal.json() as DashboardProjection;
    for (const period of [temporalFixture.previousPeriod, temporalFixture.currentPeriod]) {
      const point = temporalProjection.examActivitySeries.find(item => item.period === period);
      expect(point?.metric.status, `${period} must suppress the stable-nine pair`).toBe('suppressed');
      expect(point?.metric).not.toHaveProperty('value');
      expect(point).not.toHaveProperty('delta');
      expect(point).not.toHaveProperty('trend');
    }
    expect(temporalProjection).not.toHaveProperty('delta');
    expect(temporalProjection).not.toHaveProperty('trend');
    expect(JSON.stringify(temporalProjection.examActivitySeries)).not.toMatch(/"(?:delta|trend)"/);
  });

  test('same-browser tenant switch never renders the warmed company A canary for company B', async ({ page, context, baseURL }) => {
    await setBrowserToken(context, baseURL!, tokens.rhA);
    const companyADashboardPromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/dashboard'
        && url.searchParams.get('period') === '1m'
        && response.request().resourceType() === 'fetch';
    });
    await page.goto('/dashboard');
    const companyADashboard = await companyADashboardPromise;
    expect(companyADashboard.status(), await companyADashboard.text()).toBe(200);
    await expectPrivateBrowserResponse(companyADashboard);
    expect(await companyADashboard.text()).toContain(COMPANY_A_CANARY);
    await expect(page.locator('#main-content')).toContainText(COMPANY_A_CANARY);

    await page.locator('nav a[href="/campanhas"]').click();
    await expect(page).toHaveURL(/\/campanhas$/);
    await expect(page.locator('body')).not.toContainText(COMPANY_A_CANARY);
    await page.evaluate((companyACanary) => {
      const root = document.documentElement;
      root.dataset.privacyTenantLeak = '0';
      root.dataset.privacyLoadingSeen = '0';
      const scan = () => {
        const text = document.body?.innerText ?? '';
        if (text.includes(companyACanary)) root.dataset.privacyTenantLeak = '1';
        if (/Preparando sua vis|Carregando sua/.test(text)) {
          root.dataset.privacyLoadingSeen = '1';
        }
      };
      new MutationObserver(scan).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      scan();
    }, COMPANY_A_CANARY);

    await setBrowserToken(context, baseURL!, tokens.rhB);
    const companyBAuthPromise = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/auth/me',
    );
    await page.goto('/analytics-emails');
    await expect(page).toHaveURL(/\/analytics-emails$/);
    const companyBAuth = await companyBAuthPromise;
    expect(companyBAuth.status()).toBe(200);
    await expectPrivateBrowserResponse(companyBAuth);
    await expect(page.getByText('Privacy RH B', { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(COMPANY_A_CANARY);
    await page.evaluate((companyACanary) => {
      const root = document.documentElement;
      root.dataset.privacyTenantLeak = '0';
      root.dataset.privacyLoadingSeen = '0';
      const scan = () => {
        const text = document.body?.innerText ?? '';
        if (text.includes(companyACanary)) root.dataset.privacyTenantLeak = '1';
        if (/Preparando sua vis|Carregando sua/.test(text)) {
          root.dataset.privacyLoadingSeen = '1';
        }
      };
      new MutationObserver(scan).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      scan();
    }, COMPANY_A_CANARY);

    const companyBDashboardPromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/dashboard'
        && url.searchParams.get('period') === '1m'
        && response.request().resourceType() === 'fetch';
    });
    const companyBDashboardAuthPromise = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/api/auth/me',
    );
    await page.locator('nav a[href="/dashboard"]').click();
    const [companyBDashboard, companyBDashboardAuth] = await Promise.all([
      companyBDashboardPromise,
      companyBDashboardAuthPromise,
    ]);
    expect(companyBDashboard.status(), await companyBDashboard.text()).toBe(200);
    await expectPrivateBrowserResponse(companyBDashboard);
    expect(companyBDashboardAuth.status(), await companyBDashboardAuth.text()).toBe(200);
    await expectPrivateBrowserResponse(companyBDashboardAuth);
    expect(await companyBDashboardAuth.json()).toMatchObject({ user: { id: ids.rhB } });
    const companyBPayload = await companyBDashboard.text();
    expect(companyBPayload).toContain(COMPANY_B_CANARY);
    expect(companyBPayload).not.toContain(COMPANY_A_CANARY);
    await expect(page.locator('#main-content')).toContainText(COMPANY_B_CANARY, {
      timeout: 10_000,
    });
    await expect(page.locator('#main-content')).not.toContainText(COMPANY_A_CANARY);
    await expect(page.locator('aside')).toContainText('Privacy Company B', {
      timeout: 10_000,
    });
    await expect(page.locator('aside')).not.toContainText('Privacy Company A');
    expect(await page.evaluate(() => document.documentElement.dataset.privacyTenantLeak)).toBe('0');
    expect(await page.evaluate(() => document.documentElement.dataset.privacyLoadingSeen)).toBe('1');
  });

  test('history stays unavailable and communications exclude every Agenda payload', async ({ request }) => {
    for (const token of [tokens.rhA, tokens.leadershipA, tokens.admin]) {
      const history = await request.get('/api/analytics/history?period=6', {
        headers: authHeaders(token),
      });
      expect(history.status(), await history.text()).toBe(410);
      expectPrivateResponse(history);
      const historyPayload = await history.json() as { status: string; reason: string };
      expect(historyPayload).toMatchObject({
        status: 'unavailable',
        reason: 'eligible_ledger_required',
      });
    }

    for (const token of [tokens.rhA, tokens.admin]) {
      const communications = await request.get('/api/analytics/communications?period=30', {
        headers: authHeaders(token),
      });
      expect(communications.status(), await communications.text()).toBe(200);
      expectPrivateResponse(communications);
      const payload = await communications.text();
      expect(payload).not.toContain(COMPANY_A_CANARY);
      expect(payload).not.toContain(COMPANY_B_CANARY);
      expect(payload).not.toMatch(/agenda|consulta|mamografia|09:30/i);
    }
  });

  test('every authenticated Agenda and notification response is private and uncacheable', async ({ request }) => {
    const created = await request.post('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorA),
      data: {
        title: 'Private header probe',
        type: 'lembrete',
        date: '2026-12-23',
        time: '12:00',
      },
    });
    expect(created.status(), await created.text()).toBe(200);
    expectPrivateResponse(created);
    const eventId = (await created.json() as { id: string }).id;

    const listed = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(listed.status(), await listed.text()).toBe(200);
    expectPrivateResponse(listed);

    const patched = await request.patch(`/api/collaborator/agenda/${eventId}`, {
      headers: authHeaders(tokens.collaboratorA),
      data: { notes: 'private response' },
    });
    expect(patched.status(), await patched.text()).toBe(200);
    expectPrivateResponse(patched);

    const crossUser = await request.patch(`/api/collaborator/agenda/${eventId}`, {
      headers: authHeaders(tokens.collaboratorB),
      data: { notes: 'hidden ownership' },
    });
    expect(crossUser.status(), await crossUser.text()).toBe(404);
    expectPrivateResponse(crossUser);

    const deniedManager = await request.get('/api/collaborator/agenda', {
      headers: authHeaders(tokens.rhA),
    });
    expect(deniedManager.status(), await deniedManager.text()).toBe(403);
    expectPrivateResponse(deniedManager);

    const deniedReminderAction = await request.post('/api/notifications/reminder-action', {
      headers: authHeaders(tokens.rhA),
      data: { notificationId: 'not-owned', action: 'complete' },
    });
    expect(deniedReminderAction.status(), await deniedReminderAction.text()).toBe(403);
    expectPrivateResponse(deniedReminderAction);

    const notifications = await request.get('/api/notifications', {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(notifications.status(), await notifications.text()).toBe(200);
    expectPrivateResponse(notifications);

    const deleted = await request.delete(`/api/collaborator/agenda/${eventId}`, {
      headers: authHeaders(tokens.collaboratorA),
    });
    expect(deleted.status(), await deleted.text()).toBe(200);
    expectPrivateResponse(deleted);
  });
});
