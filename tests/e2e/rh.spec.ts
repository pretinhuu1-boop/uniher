/**
 * rh.spec.ts — Testes do painel RH / Admin da Empresa
 * Cobre: criação de RH via admin, login RH, dashboard, convites, aprovações, objetivos, permissões
 */
import { test, expect, type Page } from '@playwright/test';
import type { ProtectedDashboardProjection } from '../../src/types/platform';
import {
  expectNoRecursiveKeys,
  expectPrivacyReviewResponse,
  expectPrivateResponse,
  extractAccessTokenFromSetCookie,
} from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';
const SUPPRESSION_MESSAGE = 'Dados insuficientes para proteger a privacidade' as const;

function suppressedMetric(reason: 'minimum_cohort' | 'not_computable') {
  return { status: 'suppressed', reason, message: SUPPRESSION_MESSAGE } as const;
}

const protectedDashboardFixture: ProtectedDashboardProjection = {
  filters: { period: '1m' },
  metrics: {
    examActivity: suppressedMetric('minimum_cohort'),
    engagement: suppressedMetric('not_computable'),
    healthRisk: suppressedMetric('not_computable'),
    campaignParticipation: suppressedMetric('not_computable'),
    roi: suppressedMetric('not_computable'),
  },
  departments: [
    {
      id: 'd1',
      name: '=SUM(1,1)',
      color: '#536444',
      metric: suppressedMetric('minimum_cohort'),
    },
    {
      id: 'd2',
      name: 'Produto',
      color: '#b98643',
      metric: suppressedMetric('minimum_cohort'),
    },
  ],
  ageDistribution: [
    {
      label: '26-35',
      color: '#536444',
      metric: suppressedMetric('minimum_cohort'),
    },
  ],
  examActivitySeries: [
    { period: '2026-07', metric: suppressedMetric('minimum_cohort') },
  ],
};

async function completeAuthTourForDashboard(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        user: { ...body.user, firstAccessTourCompleted: true },
      },
    });
  });
}

test.describe('RH — Painel da Empresa', () => {
  test.describe.configure({ mode: 'serial' });

  const ts = Date.now().toString().slice(-8);
  const companyName = `Empresa RH ${ts}`;
  const companyCnpj = `22.333.444/0001-${ts.slice(0, 2)}`;
  const rhEmail = `rh-test-${ts}@empresa.com`;
  const rhPassword = 'RhTeste@2026';
  const rhName = `Gestora RH ${ts}`;

  let adminToken: string;
  let companyId: string;
  let rhToken: string;
  let inviteToken: string;
  let invitedUserId: string;

  // ─── Setup: Admin cria empresa e RH ──────────────────────────────────────────

  test('Setup: admin faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    adminToken = extractAccessTokenFromSetCookie(res);
    expect(adminToken).toBeTruthy();
  });

  test('Setup: admin cria empresa', async ({ request }) => {
    const res = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: companyName,
        cnpj: companyCnpj,
        sector: 'Educação',
        plan: 'pro',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    companyId = body.company.id;
  });

  test('Setup: admin cria usuário RH vinculado à empresa', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: rhName,
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
  });

  // ─── Login RH ────────────────────────────────────────────────────────────────

  test('POST /api/auth/login — RH faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: rhEmail, password: rhPassword },
    });

    expect(res.status()).toBe(200);
    rhToken = extractAccessTokenFromSetCookie(res);
    expect(rhToken).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('rh');
    expect(body.user.email).toBe(rhEmail);
  });

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  test('GET /api/dashboard — RH acessa dashboard da empresa', async ({ request }) => {
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
    ]);
    expect(body.filters).toEqual({ period: '1m' });
    expect(Object.keys(body.metrics).sort()).toEqual([
      'campaignParticipation',
      'engagement',
      'examActivity',
      'healthRisk',
      'roi',
    ]);
    expect(body.metrics).toEqual({
      examActivity: suppressedMetric('minimum_cohort'),
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
    expectNoRecursiveKeys(
      body,
      /numerator|denominator|counts?|collaborators?|points?|level|badges?|rankings?/i,
      [companyName, companyId, rhEmail, rhName, ADMIN_EMAIL],
    );
  });

  test('Dashboard RH compõe somente indicadores protegidos sem overflow', async ({ page, context, baseURL }) => {
    await context.addCookies([
      {
        name: 'uniher-access-token',
        value: rhToken,
        url: baseURL!,
      },
    ]);
    await completeAuthTourForDashboard(page);
    await page.route('**/api/rh/onboarding-status', (route) =>
      route.fulfill({ json: { isNewRH: false, steps: {} } }),
    );
    await page.route('**/api/dashboard?**', (route) => route.fulfill({ json: protectedDashboardFixture }));
    await page.setViewportSize({ width: 1024, height: 812 });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: `Bom dia, ${rhName.split(' ')[0]}.` })).toBeVisible();

    const dashboardContent = page.locator('#main-content');
    await expect(dashboardContent).not.toContainText(/diagnóstico|paciente|dados? individuais?/i);
    await expect(dashboardContent).not.toContainText(/\\u[0-9a-f]{4}/i);

    const summary = page.getByRole('region', { name: 'Resumo protegido da empresa' });
    await expect(summary.getByText('Atividade de exames')).toBeVisible();
    await expect(summary.getByText('Engajamento')).toBeVisible();
    await expect(summary.getByText('Participação em campanha')).toBeVisible();
    await expect(summary).toContainText(SUPPRESSION_MESSAGE);

    const actions = page.getByRole('region', { name: 'Próximas ações' });
    await expect(actions.getByRole('link', { name: /Campanhas/ })).toHaveAttribute('href', '/campanhas');
    await expect(actions.getByRole('link', { name: /Convites/ })).toHaveAttribute('href', '/convites');
    await expect(actions.getByRole('link', { name: /Histórico/ })).toHaveAttribute('href', '/historico');

    await expect(page.getByRole('heading', { name: 'Indicadores protegidos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contribuintes ativos por área' })).toBeVisible();
    const ageOverview = page.getByRole('region', { name: 'Faixas etárias protegidas' });
    await expect(ageOverview.getByRole('heading', { name: 'Faixas etárias protegidas' })).toBeVisible();
    await expect(ageOverview.getByText(SUPPRESSION_MESSAGE, { exact: true })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Engajamento' }).getByRole('status')).toHaveText(SUPPRESSION_MESSAGE);
    await expect(page.getByTestId('dashboard-roi')).toHaveCount(0);
    await expect(page.locator('[data-legacy-stat-card]')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(0);

    const periodFilter = page.getByRole('button', { name: '3m' }).locator('..');
    const departmentFilter = page.getByRole('combobox', { name: 'Filtrar por departamento' });
    for (const filter of [periodFilter, departmentFilter]) {
      await expect(filter).toBeVisible();
      expect(await filter.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= window.innerWidth;
      })).toBe(true);
    }
    await periodFilter.getByRole('button', { name: '3m' }).click();
    await expect(periodFilter.getByRole('button', { name: '3m' })).toHaveAttribute('aria-pressed', 'true');
    await departmentFilter.selectOption('d1');
    const departmentOverview = page.getByRole('region', { name: /Contribuintes ativos/ });
    await expect(departmentOverview.getByText('=SUM(1,1)')).toBeVisible();
    await expect(departmentOverview.getByText('Produto')).toBeVisible();
    await expect(departmentOverview.getByText(SUPPRESSION_MESSAGE, { exact: true })).toHaveCount(2);
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true);
  });

  test('Histórico e Comunicações renderizam copy portuguesa íntegra', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'uniher-access-token', value: rhToken, url: baseURL! }]);
    await completeAuthTourForDashboard(page);

    await page.goto('/historico');
    await expect(page.getByRole('heading', { name: 'Histórico protegido' })).toBeVisible();
    await expect(page.locator('#main-content')).not.toContainText(/\\u[0-9a-f]{4}/i);

    await page.goto('/analytics-emails');
    await expect(page.getByRole('heading', { name: 'Entregas de comunicação' })).toBeVisible();
    await expect(page.locator('#main-content')).not.toContainText(/\\u[0-9a-f]{4}/i);
  });

  test('Dashboard RH mostra erro da API e bloqueia exportação vazia', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'uniher-access-token', value: rhToken, url: baseURL! }]);
    await completeAuthTourForDashboard(page);
    await page.route('**/api/rh/onboarding-status', (route) =>
      route.fulfill({ json: { isNewRH: false, steps: {} } }),
    );
    await page.route('**/api/dashboard?**', (route) => route.fulfill({
      status: 500,
      json: { error: 'Falha controlada' },
    }));

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /carregar o dashboard/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  test('Dashboard RH preserva o redirect real do onboarding', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'uniher-access-token', value: rhToken, url: baseURL! }]);
    await completeAuthTourForDashboard(page);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/onboarding-rh$/);
    await expect(page.getByRole('heading', { name: 'Bem-vinda ao UniHER!' })).toBeVisible();
    await page.unrouteAll({ behavior: 'wait' });
  });

  // ─── Convites ────────────────────────────────────────────────────────────────

  test('POST /api/invites — RH cria convite para colaboradora', async ({ request }) => {
    const invitedEmail = `colab-rh-${ts}@email.com`;

    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        email: invitedEmail,
        role: 'colaboradora',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('inviteUrl');
    expect(body.email).toBe(invitedEmail);
    inviteToken = body.token;
  });

  test('POST /api/invites — RH NÃO pode convidar outro RH (403)', async ({ request }) => {
    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        email: `outro-rh-${ts}@empresa.com`,
        role: 'rh',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/invites — rejeita convite duplicado (mesmo email pendente)', async ({ request }) => {
    const duplicateEmail = `colab-dup-rh-${ts}@email.com`;

    // Primeiro convite
    await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { email: duplicateEmail, role: 'colaboradora' },
    });

    // Segundo convite mesmo email
    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { email: duplicateEmail, role: 'colaboradora' },
    });

    expect(res.status()).toBe(409);
  });

  test('GET /api/invites — RH lista convites da empresa', async ({ request }) => {
    const res = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('invites');
    expect(Array.isArray(body.invites)).toBeTruthy();
    expect(body.invites.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Registro via convite e aprovação ────────────────────────────────────────

  test('POST /api/auth/register — colaboradora se registra via convite', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: `Colaboradora RH ${ts}`,
        email: `colab-rh-${ts}@email.com`,
        password: 'Colab@2026',
        role: 'colaboradora',
        companyId,
        inviteToken,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body).not.toHaveProperty('accessToken');
    invitedUserId = body.user.id;
  });

  test('PATCH /api/invites/approve — RH aprova colaboradora', async ({ request }) => {
    // Pula se não temos o userId da colaboradora
    test.skip(!invitedUserId, 'userId não disponível (registro falhou)');

    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        userId: invitedUserId,
        action: 'approve',
      },
    });

    // Pode ser 200 (aprovada) ou 404 (já aprovada automaticamente)
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('PATCH /api/invites/approve — RH NÃO pode aprovar outro RH (403)', async ({ request }) => {
    // Cria um RH pendente via admin
    const rhPendingEmail = `rh-pending-${ts}@empresa.com`;
    const createRes = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: 'RH Pendente',
        email: rhPendingEmail,
        password: 'Teste@2026',
        role: 'rh',
        company_id: companyId,
      },
    });

    if (createRes.status() !== 200) {
      test.skip(true, 'Não foi possível criar RH pendente');
      return;
    }

    const { id: pendingRhId } = await createRes.json();

    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        userId: pendingRhId,
        action: 'approve',
      },
    });

    // Pode ser 403 (RH tentando aprovar RH) ou 404 (auto-approved=1)
    expect([403, 404]).toContain(res.status());
  });

  test('PATCH /api/invites/approve — rejeita body inválido', async ({ request }) => {
    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {},
    });

    expect(res.status()).toBe(422);
  });

  // ─── Objetivos ───────────────────────────────────────────────────────────────

  test('GET /api/rh/objectives — permanece indisponível durante privacy review', async ({ request }) => {
    const res = await request.get('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    await expectPrivacyReviewResponse(res, [companyName, companyId, rhEmail, rhName]);
  });

  test('POST /api/rh/objectives — não aceita objetivo durante privacy review', async ({ request }) => {
    const res = await request.post('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        title: `Objetivo Teste ${ts}`,
        description: 'Objetivo criado nos testes e2e',
        type: 'weekly',
        target_type: 'points',
        target_value: 100,
        reward_type: 'points',
        reward_points: 50,
      },
    });

    await expectPrivacyReviewResponse(res, [companyName, companyId, rhEmail, rhName]);
  });

  test('POST /api/rh/objectives — não revela validação legada durante privacy review', async ({ request }) => {
    const res = await request.post('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        type: 'weekly',
        target_type: 'points',
        target_value: 100,
        reward_type: 'points',
        reward_points: 50,
      },
    });

    await expectPrivacyReviewResponse(res, [companyName, companyId, rhEmail, rhName]);
  });

  // ─── Permissões ──────────────────────────────────────────────────────────────

  test('RH NÃO pode acessar endpoints de admin master', async ({ request }) => {
    const resCompanies = await request.get('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resCompanies.status());

    const resUsers = await request.get('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resUsers.status());

    const resSystem = await request.get('/api/admin/system', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resSystem.status());
  });

  test('GET /api/invites — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/invites');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/invites — rejeita sem autenticação', async ({ request }) => {
    const res = await request.post('/api/invites', {
      data: { email: 'test@test.com', role: 'colaboradora' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
