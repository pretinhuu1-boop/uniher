/**
 * integrado.spec.ts — Teste de fluxo completo E2E
 * Fluxo: Admin cria empresa → cria RH → RH loga → RH convida colaboradora →
 *        colaboradora aceita → RH aprova → colaboradora loga → check-in → missões
 */
import { test, expect } from '@playwright/test';
import type { ProtectedDashboardProjection } from '../../src/types/platform';
import {
  expectNoRecursiveKeys,
  expectPrivacyReviewResponse,
  expectPrivateResponse,
} from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';
const SUPPRESSION_MESSAGE = 'Dados insuficientes para proteger a privacidade' as const;

function suppressedMetric(reason: 'minimum_cohort' | 'not_computable') {
  return { status: 'suppressed', reason, message: SUPPRESSION_MESSAGE } as const;
}

test.describe('Fluxo Integrado E2E — Jornada Completa', () => {
  test.describe.configure({ mode: 'serial' });

  const ts = Date.now().toString().slice(-8);

  // Dados do fluxo
  const companyName = `Empresa Integrada ${ts}`;
  const companyCnpj = `55.666.777/0001-${ts.slice(0, 2)}`;
  const rhEmail = `rh-int-${ts}@empresa.com`;
  const rhPassword = 'RhIntegrado@2026';
  const colabEmail = `colab-int-${ts}@email.com`;
  const colabPassword = 'ColabInt@2026';

  // State compartilhado entre steps
  let adminToken: string;
  let companyId: string;
  let rhUserId: string;
  let rhToken: string;
  let inviteToken: string;
  let colabUserId: string;
  let colabToken: string;

  // ─── Step 1: Admin faz login ─────────────────────────────────────────────────

  test('Step 1: Admin Master faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    expect(res.status()).toBe(200);
    const cookies = res.headers()['set-cookie'] || '';
    const match = cookies.match(/uniher-access-token=([^;]+)/);
    adminToken = match?.[1] || '';
    expect(adminToken).toBeTruthy();
  });

  // ─── Step 2: Admin cria empresa ──────────────────────────────────────────────

  test('Step 2: Admin cria empresa', async ({ request }) => {
    test.skip(!adminToken, 'Admin login falhou');

    const res = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: companyName,
        cnpj: companyCnpj,
        sector: 'Varejo',
        plan: 'enterprise',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    companyId = body.company.id;
    expect(companyId).toBeTruthy();
  });

  // ─── Step 3: Admin cria usuário RH ───────────────────────────────────────────

  test('Step 3: Admin cria usuário RH vinculado à empresa', async ({ request }) => {
    test.skip(!adminToken || !companyId, 'Steps anteriores falharam');

    const res = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: `Gestora RH Integrado ${ts}`,
        email: rhEmail,
        password: rhPassword,
        role: 'rh',
        company_id: companyId,
        mustChangePassword: false,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    rhUserId = body.id;
  });

  // ─── Step 4: RH faz login ───────────────────────────────────────────────────

  test('Step 4: RH faz login', async ({ request }) => {
    test.skip(!rhUserId, 'Criação do RH falhou');

    const res = await request.post('/api/auth/login', {
      data: { email: rhEmail, password: rhPassword },
    });

    expect(res.status()).toBe(200);
    const cookies = res.headers()['set-cookie'] || '';
    const match = cookies.match(/uniher-access-token=([^;]+)/);
    rhToken = match?.[1] || '';
    expect(rhToken).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('rh');
  });

  // ─── Step 5: RH acessa dashboard ────────────────────────────────────────────

  test('Step 5: RH acessa dashboard da empresa', async ({ request }) => {
    test.skip(!rhToken, 'Login do RH falhou');

    const res = await request.get('/api/dashboard', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    expectPrivateResponse(res);
    const body = await res.json() as ProtectedDashboardProjection;
    expect(Object.keys(body).sort()).toEqual([
      'ageDistribution',
      'departments',
      'examActivitySeries',
      'filters',
      'metrics',
      'wellbeingSeries',
    ]);
    expect(body.filters).toEqual({ period: '1m' });
    expect(Object.keys(body.metrics).sort()).toEqual([
      'campaignParticipation',
      'engagement',
      'examActivity',
      'healthRisk',
      'roi',
      'wellbeingCheckIn',
      'wellbeingCheckOut',
    ]);
    expect(body.metrics).toEqual({
      examActivity: suppressedMetric('minimum_cohort'),
      wellbeingCheckIn: suppressedMetric('minimum_cohort'),
      wellbeingCheckOut: suppressedMetric('minimum_cohort'),
      engagement: suppressedMetric('not_computable'),
      healthRisk: suppressedMetric('not_computable'),
      campaignParticipation: suppressedMetric('not_computable'),
      roi: suppressedMetric('not_computable'),
    });
    expect(body.departments).toEqual([]);
    expect(body.ageDistribution.map(({ label }) => label)).toEqual([
      '18-25',
      '26-35',
      '36-45',
      '46-55',
      '56+',
    ]);
    for (const bucket of body.ageDistribution) {
      expect(Object.keys(bucket).sort()).toEqual(['color', 'label', 'metric']);
      expect(bucket.metric).toEqual(suppressedMetric('minimum_cohort'));
    }
    expect(body.examActivitySeries.length).toBeGreaterThan(0);
    for (const point of body.examActivitySeries) {
      expect(Object.keys(point).sort()).toEqual(['metric', 'period']);
      expect(point.period).toMatch(/^\d{4}-\d{2}$/);
      expect(point.metric).toEqual(suppressedMetric('minimum_cohort'));
    }
    for (const point of body.wellbeingSeries) {
      expect(Object.keys(point).sort()).toEqual(['checkIn', 'checkOut', 'period']);
      expect(point.period).toMatch(/^\d{4}-\d{2}$/);
      expect(point.checkIn).toEqual(suppressedMetric('minimum_cohort'));
      expect(point.checkOut).toEqual(suppressedMetric('minimum_cohort'));
    }
    expectNoRecursiveKeys(
      body,
      /numerator|denominator|counts?|collaborators?|points?|level|badges?|rankings?/i,
      [companyName, companyId, rhEmail, colabEmail],
    );
  });

  // ─── Step 6: RH cria convite ────────────────────────────────────────────────

  test('Step 6: RH convida colaboradora', async ({ request }) => {
    test.skip(!rhToken, 'Login do RH falhou');

    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { email: colabEmail, role: 'colaboradora' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('token');
    inviteToken = body.token;
  });

  // ─── Step 7: RH verifica convite na lista ────────────────────────────────────

  test('Step 7: RH verifica convite na lista', async ({ request }) => {
    test.skip(!rhToken, 'Login do RH falhou');

    const res = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.invites.length).toBeGreaterThanOrEqual(1);

    const invite = body.invites.find((i: { email: string }) => i.email === colabEmail);
    expect(invite).toBeTruthy();
    expect(invite.status).toBe('pending');
  });

  // ─── Step 8: Colaboradora aceita convite (registro) ─────────────────────────

  test('Step 8: Colaboradora se registra via convite', async ({ request }) => {
    test.skip(!inviteToken || !companyId, 'Convite não foi criado');

    const res = await request.post('/api/auth/register', {
      data: {
        name: `Maria Integrada ${ts}`,
        email: colabEmail,
        password: colabPassword,
        role: 'colaboradora',
        companyId,
        inviteToken,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body.user.role).toBe('colaboradora');
    colabUserId = body.user.id;
    const regCookies = res.headers()['set-cookie'] || '';
    const regMatch = regCookies.match(/uniher-access-token=([^;]+)/);
    colabToken = regMatch?.[1] || '';
  });

  // ─── Step 9: RH aprova colaboradora ──────────────────────────────────────────

  test('Step 9: RH aprova colaboradora', async ({ request }) => {
    test.skip(!rhToken || !colabUserId, 'Steps anteriores falharam');

    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { userId: colabUserId, action: 'approve' },
    });

    // 200 = aprovada, 404 = já aprovada automaticamente
    expect([200, 404]).toContain(res.status());
  });

  // ─── Step 10: Colaboradora faz login após aprovação ─────────────────────────

  test('Step 10: Colaboradora faz login após aprovação', async ({ request }) => {
    test.skip(!colabUserId, 'Registro da colaboradora falhou');

    const res = await request.post('/api/auth/login', {
      data: { email: colabEmail, password: colabPassword },
    });

    expect(res.status()).toBe(200);
    const loginCookies = res.headers()['set-cookie'] || '';
    const loginMatch = loginCookies.match(/uniher-access-token=([^;]+)/);
    colabToken = loginMatch?.[1] || '';
    expect(colabToken).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('colaboradora');
  });

  // ─── Step 11: Colaboradora acessa dashboard ──────────────────────────────────

  test('Step 11: Colaboradora NÃO acessa dashboard de RH (403)', async ({ request }) => {
    test.skip(!colabToken, 'Login da colaboradora falhou');

    const res = await request.get('/api/dashboard', {
      headers: { Cookie: `uniher-access-token=${colabToken}` },
    });

    // Dashboard é restrito a admin/rh/lideranca — colaboradora recebe 403
    expect(res.status()).toBe(403);
  });

  // ─── Step 12: Colaboradora faz check-in ──────────────────────────────────────

  test('Step 12: Colaboradora faz check-in diário', async ({ request }) => {
    test.skip(!colabToken, 'Login da colaboradora falhou');

    const res = await request.post('/api/gamification/check-in', {
      headers: { Cookie: `uniher-access-token=${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  // ─── Step 13: Colaboradora verifica streak ───────────────────────────────────

  test('Step 13: Colaboradora verifica streak após check-in', async ({ request }) => {
    test.skip(!colabToken, 'Login da colaboradora falhou');

    const res = await request.get('/api/gamification/streak-status', {
      headers: { Cookie: `uniher-access-token=${colabToken}` },
    });

    expect(res.status()).toBe(200);
    expectPrivateResponse(res);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual([
      'checkInMood',
      'checkOutMood',
      'checkedInToday',
      'checkedOutToday',
      'streak',
    ]);
    expect(body.checkedInToday).toBe(true);
    expect(typeof body.checkedOutToday).toBe('boolean');
    expect(body.streak).toBeGreaterThanOrEqual(1);
    expectNoRecursiveKeys(
      body,
      /ranking|points?|xp|level|league|badges?/i,
      [companyName, companyId, rhEmail, colabEmail],
    );
  });

  // ─── Step 14: Colaboradora visualiza missões ────────────────────────────────

  test('Step 14: Colaboradora visualiza missões diárias', async ({ request }) => {
    test.skip(!colabToken, 'Login da colaboradora falhou');

    const res = await request.get('/api/gamification/daily-missions', {
      headers: { Cookie: `uniher-access-token=${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('missions');
    expect(Array.isArray(body.missions)).toBeTruthy();
  });

  // ─── Step 15: Colaboradora visualiza leaderboard ─────────────────────────────

  test('Step 15: Leaderboard permanece indisponível durante privacy review', async ({ request }) => {
    test.skip(!colabToken, 'Login da colaboradora falhou');

    const res = await request.get('/api/gamification/leaderboard', {
      headers: { Cookie: `uniher-access-token=${colabToken}` },
    });

    await expectPrivacyReviewResponse(res, [companyName, companyId, rhEmail, colabEmail]);
  });

  // ─── Step 16: Health check continua saudável ────────────────────────────────

  test('Step 16: Health check confirma sistema saudável após todo o fluxo', async ({ request }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(['status', 'timestamp']);
    expect(body.status).toBe('healthy');
    expect(typeof body.timestamp).toBe('string');
    expect(JSON.stringify(body)).not.toMatch(
      /db|database|memory|heap|rss|uptime|users|companies|queue|pending|failed|size|version|path/i,
    );
  });
});
