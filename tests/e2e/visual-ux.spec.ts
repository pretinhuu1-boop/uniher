/**
 * visual-ux.spec.ts — Teste visual E2E completo
 * Simula usuário real: abre browser, clica, preenche, verifica.
 * Cobre: Master Admin → Admin Empresa → Colaboradora
 *
 * Rodar: npx playwright test --project=visual-ux
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { test, expect, Page, type APIRequestContext } from '@playwright/test';
import playwrightDbSafety from '../playwright-db-safety.cjs';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASS = 'Admin@2026';
const DEMO_RH_EMAIL = 'rh.visual@eduardaeyurimarketingltda.com.br';
const DEMO_COMPANY_CNPJ = '00.000.000/0001-00';
const DEMO_NR1_COLLAB_EMAIL = 'nr1.visual@eduardaeyurimarketingltda.com.br';
const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/superpowers/evidence');

function evidencePath(filename: string): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, filename);
}

function assertVisualUxFixtureHostIsLoopback(): void {
  const configuredBaseUrl = process.env.BASE_URL
    ?? `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '3100'}`;
  let hostname: string;

  try {
    hostname = new URL(configuredBaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(`[visual-ux] BASE_URL inválida; fixtures mutáveis bloqueadas: ${configuredBaseUrl}`);
  }

  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new Error(
      `[visual-ux] Fixtures mutáveis bloqueadas para host não-loopback: ${hostname}. `
      + 'Execute este projeto somente em localhost, 127.0.0.1 ou [::1].',
    );
  }
}

assertVisualUxFixtureHostIsLoopback();

async function findDemoCompanyId(request: APIRequestContext, adminCookie: string): Promise<string> {
  let offset = 0;

  while (true) {
    const response = await request.get(`/api/admin/companies?limit=200&offset=${offset}`, {
      headers: { Cookie: `uniher-access-token=${adminCookie}` },
    });
    expect(response.ok(), `Falha ao listar empresas: HTTP ${response.status()}`).toBeTruthy();

    const body = await response.json() as {
      companies?: Array<{ cnpj: string; id: string }>;
      total?: number;
    };
    const companies = body.companies ?? [];
    const demo = companies.find((company) => company.cnpj === DEMO_COMPANY_CNPJ);
    if (demo) return demo.id;

    offset += companies.length;
    if (companies.length === 0 || offset >= (body.total ?? 0)) break;
  }

  throw new Error(`Empresa de fixture ${DEMO_COMPANY_CNPJ} não encontrada`);
}

// Helper: ensure the demo RH user exists (idempotent)
async function ensureDemoRhUser(request: APIRequestContext): Promise<void> {
  assertVisualUxFixtureHostIsLoopback();
  const adminLoginRes = await request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(adminLoginRes.ok(), `Login admin falhou: HTTP ${adminLoginRes.status()}`).toBeTruthy();

  const adminCookie = extractAccessTokenFromSetCookie(adminLoginRes);
  expect(adminCookie).toBeTruthy();

  // Create demo company (409 if already exists — ignored)
  const compRes = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminCookie}` },
    data: { name: 'Eduardo e Yurimara Marketing LTDA', cnpj: DEMO_COMPANY_CNPJ, sector: 'Marketing', plan: 'pro' },
  });
  expect([200, 409]).toContain(compRes.status());
  const demoCompanyId = compRes.ok()
    ? ((await compRes.json()).company?.id as string)
    : await findDemoCompanyId(request, adminCookie);
  expect(demoCompanyId).toBeTruthy();

  const userRes = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${adminCookie}` },
    data: {
      name: 'Contabilidade RH',
      email: DEMO_RH_EMAIL,
      password: ADMIN_PASS,
      role: 'rh',
      company_id: demoCompanyId,
      mustChangePassword: false,
      also_collaborator: true,
    },
  });
  expect([200, 409]).toContain(userRes.status());

  const rhLoginRes = await request.post('/api/auth/login', {
    data: { email: DEMO_RH_EMAIL, password: ADMIN_PASS },
  });
  expect(rhLoginRes.ok(), `Login RH falhou: HTTP ${rhLoginRes.status()}`).toBeTruthy();
  const rhCookie = extractAccessTokenFromSetCookie(rhLoginRes);
  expect(rhCookie).toBeTruthy();
  const rhHeaders = { Cookie: `uniher-access-token=${rhCookie}` };

  const preferencesRes = await request.patch('/api/users/me/preferences', {
    headers: rhHeaders,
    data: { preferences: { first_access_tour_completed: '1' } },
  });
  expect(preferencesRes.ok(), `Tour RH não foi concluído: HTTP ${preferencesRes.status()}`).toBeTruthy();

  const companyRes = await request.patch('/api/company', {
    headers: rhHeaders,
    data: { tradeName: 'Eduardo e Yurimara Marketing' },
  });
  expect(companyRes.ok(), `Perfil da empresa não foi atualizado: HTTP ${companyRes.status()}`).toBeTruthy();

  const departmentsRes = await request.get('/api/rh/departments', { headers: rhHeaders });
  expect(departmentsRes.ok(), `Departamentos não carregaram: HTTP ${departmentsRes.status()}`).toBeTruthy();
  const { departments = [] } = await departmentsRes.json() as { departments?: unknown[] };
  if (departments.length === 0) {
    const createDepartmentRes = await request.post('/api/rh/departments', {
      headers: rhHeaders,
      data: { name: 'Operações', color: '#3E7D5A' },
    });
    expect([200, 409]).toContain(createDepartmentRes.status());
  }

  const onboardingRes = await request.get('/api/rh/onboarding-status', { headers: rhHeaders });
  expect(onboardingRes.ok(), `Onboarding RH não carregou: HTTP ${onboardingRes.status()}`).toBeTruthy();
  const onboarding = await onboardingRes.json() as { completedCount?: number; isNewRH?: boolean };
  expect(onboarding.completedCount).toBeGreaterThanOrEqual(3);
  expect(onboarding.isNewRH).toBe(false);
}

async function expectRhDashboard(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Bom dia, Contabilidade.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Resumo protegido da empresa', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convidar', exact: true })).toBeVisible();
}

async function openRhDashboard(page: Page): Promise<void> {
  const onboardingResponse = page.waitForResponse((response) => (
    response.url().includes('/api/rh/onboarding-status')
    && response.request().method() === 'GET'
  ));
  await page.goto('/dashboard');
  const response = await onboardingResponse;
  expect(response.ok(), `Onboarding RH falhou no browser: HTTP ${response.status()}`).toBeTruthy();
  const onboarding = await response.json() as { completedCount?: number; isNewRH?: boolean };
  expect(onboarding.completedCount).toBeGreaterThanOrEqual(3);
  expect(onboarding.isNewRH).toBe(false);
  await expectRhDashboard(page);
}

function masterTabButton(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) });
}

function openPlaywrightDatabase(): Database.Database {
  const databasePath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
  return new Database(databasePath);
}

function ensureNr1VisualFixtures(): void {
  const db = openPlaywrightDatabase();
  try {
    const company = db.prepare("SELECT id FROM companies WHERE cnpj = ?").get(DEMO_COMPANY_CNPJ) as { id: string } | undefined;
    if (!company) throw new Error('Empresa demo visual nao encontrada para o smoke NR-1.');

    const admin = db.prepare("SELECT password_hash FROM users WHERE email = ?").get(ADMIN_EMAIL) as { password_hash: string } | undefined;
    if (!admin) throw new Error('Usuario admin seed nao encontrado para o smoke NR-1.');

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO company_modules (
        id, company_id, module_slug, module_state, visible, notes, created_at, updated_at, updated_by
      ) VALUES (
        'visual-nr1-enabled-module',
        @companyId,
        'nr1',
        'enabled',
        1,
        'Visual smoke fixture for PR7 NR-1 role gate',
        @now,
        @now,
        NULL
      )
      ON CONFLICT(company_id, module_slug) DO UPDATE SET
        module_state = excluded.module_state,
        visible = excluded.visible,
        notes = excluded.notes,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `).run({ companyId: company.id, now });

    db.prepare(`
      INSERT INTO users (
        id, company_id, department_id, name, email, password_hash, role,
        approved, level, points, must_change_password, also_collaborator
      )
      VALUES (
        'user_demo_nr1_collaborator',
        @companyId,
        'dept_demo_visual_ops',
        'NR-1 Colaboradora',
        @email,
        @passwordHash,
        'colaboradora',
        1,
        1,
        0,
        0,
        0
      )
      ON CONFLICT(id) DO UPDATE SET
        company_id = excluded.company_id,
        department_id = excluded.department_id,
        name = excluded.name,
        email = excluded.email,
        password_hash = excluded.password_hash,
        role = excluded.role,
        approved = excluded.approved,
        must_change_password = excluded.must_change_password,
        updated_at = datetime('now')
    `).run({
      companyId: company.id,
      email: DEMO_NR1_COLLAB_EMAIL,
      passwordHash: admin.password_hash,
    });

    db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES ('user_demo_nr1_collaborator', 'first_access_tour_completed', '1', datetime('now'))
      ON CONFLICT(user_id, pref_key) DO UPDATE SET
        pref_value = excluded.pref_value,
        updated_at = excluded.updated_at
    `).run();
  } finally {
    db.close();
  }
}

// Helper: login via UI
async function loginUI(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  // Clear autofill and type
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(admin|dashboard|primeiro-acesso|colaboradora|welcome)/, { timeout: 10000 });
}

// Helper: logout via UI
async function logoutUI(page: Page) {
  // Try sidebar logout button
  const logoutBtn = page.locator('button:has-text("Sair da Conta"), button:has-text("Sair da conta")').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL('**/', { timeout: 5000 });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MASTER ADMIN
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Master Admin — Visual UX', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  const ts = Date.now().toString().slice(-6);
  const newCompanyName = `Empresa Teste ${ts}`;
  const newCompanyCnpj = `11.222.333/0001-${ts.slice(0, 2)}`;
  const newAdminEmail = `admin-visual-${ts}@empresa.com`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginUI(page, ADMIN_EMAIL, ADMIN_PASS);
  });

  test.afterAll(async () => {
    if (page && !page.isClosed()) await page.close();
  });

  test('Painel Master — Visão Geral carrega', async () => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Painel UniHER', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('Tab Empresas — lista carrega', async () => {
    await masterTabButton(page, 'Empresas').click();
    await expect(page.getByRole('heading', { name: 'Empresas Cadastradas', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Nova Empresa', exact: true })).toBeVisible();
  });

  test('Criar empresa via API e verificar na lista', async () => {
    // Create via API (more reliable than filling form)
    const res = await page.request.post('/api/admin/companies', {
      data: { name: newCompanyName, cnpj: newCompanyCnpj, sector: 'Visual Test', plan: 'trial' },
    });
    expect(res.status()).toBe(200);
    // Reload and verify in list
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Painel UniHER', exact: true })).toBeVisible();
    await masterTabButton(page, 'Empresas').click();
    await expect(page.getByRole('heading', { name: 'Empresas Cadastradas', exact: true })).toBeVisible();
    await expect(page.getByText(newCompanyName, { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Tab Usuários — lista carrega', async () => {
    await masterTabButton(page, 'Usuários').click();
    await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Novo usuário', exact: true })).toBeVisible();
  });

  test('Formulário Novo Usuário abre', async () => {
    await page.getByRole('button', { name: '+ Novo usuário', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Novo usuário Master / Admin', exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Tab Admin Master — lista visível', async () => {
    await masterTabButton(page, 'Admin Master').click();
    await expect(page.getByRole('heading', { name: 'Admins Master', exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /admin@uniher\.com\.br/ })).toBeVisible();
  });

  test('Tab Sistema — identidade visual', async () => {
    await masterTabButton(page, 'Sistema').click();
    await expect(page.getByRole('heading', { name: 'Identidade Visual do Sistema', exact: true })).toBeVisible();
  });

  test('Sidebar — Notificações e Configurações acessíveis', async () => {
    await page.getByRole('link', { name: 'Notificações', exact: true }).click();
    await page.waitForURL('**/notificacoes');
    await expect(page.getByRole('link', { name: 'Notificações', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: /^(Notificações|Nenhum aviso novo)$/ })).toBeVisible();
    await page.goBack();
  });

  test('Logout funciona', async () => {
    await logoutUI(page);
    await expect(page).toHaveURL(/\/(auth)?$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN EMPRESA (RH)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Admin Empresa — Visual UX', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    await ensureDemoRhUser(request);
    page = await browser.newPage();
    await loginUI(page, DEMO_RH_EMAIL, ADMIN_PASS);
  });

  test.afterAll(async () => {
    if (page && !page.isClosed()) await page.close();
  });

  test('Dashboard carrega sem badge debug', async () => {
    await openRhDashboard(page);
    // No OFG debug badge
    await expect(page.getByText('OFG', { exact: true })).not.toBeVisible();
  });

  test('NR-1 habilitado permanece no shell de RH', async () => {
    ensureNr1VisualFixtures();
    await openRhDashboard(page);
    await page.screenshot({ path: evidencePath('pr7-rh-dashboard-desktop.png') });

    const nr1Link = page.getByRole('link', { name: 'NR-1', exact: true });
    await expect(nr1Link).toHaveAttribute('href', '/nr1');
    await nr1Link.click();

    await expect(page).toHaveURL(/\/nr1$/);
    await expect(page.getByRole('heading', { name: 'NR-1', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Contrato antes da avalia/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Permanece bloqueado/i })).toBeVisible();
    await page.screenshot({ path: evidencePath('pr7-nr1-rh-shell-desktop.png') });
  });

  test('Colaboradoras — gestão carrega', async () => {
    await page.goto('/colaboradoras-gestao');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Gestão de Colaboradoras')).toBeVisible();
    await expect(page.locator('text=TOTAL')).toBeVisible();
  });

  test('Departamentos — página carrega', async () => {
    await page.goto('/departamentos');
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Departamentos').first()).toBeVisible({ timeout: 10000 });
  });

  test('Convites — página carrega', async () => {
    await page.goto('/convites');
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Convites').first()).toBeVisible({ timeout: 10000 });
  });

  test('Campanhas — lista carrega', async () => {
    await page.goto('/campanhas');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Campanhas Temáticas')).toBeVisible();
    await expect(page.locator('text=+ Criar Campanha')).toBeVisible();
  });

  test('Semáforo de Saúde carrega', async () => {
    await page.goto('/semaforo');
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Semáforo').first()).toBeVisible({ timeout: 10000 });
  });

  test('Troca para Colaboradora funciona', async () => {
    await openRhDashboard(page);
    const colabBtn = page.getByRole('button', { name: 'Colaboradora', exact: true });
    await expect(colabBtn).toBeVisible();
    await colabBtn.click();
    await expect(page).toHaveURL(/\/colaboradora$/);
    await expect(page.getByRole('heading', { name: 'Minha jornada', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Hoje', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('Volta para RH funciona', async () => {
    const rhBtn = page.getByRole('button', { name: 'Admin Empresa', exact: true });
    await expect(rhBtn).toBeVisible();
    await rhBtn.click();
    await expectRhDashboard(page);
  });

  test('Configurações carrega', async () => {
    await page.goto('/configuracoes');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Configurações"), h2:has-text("Configurações")')).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// MOBILE
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Colaboradora NR-1 - Visual UX', () => {
  test.beforeAll(async ({ request }) => {
    await ensureDemoRhUser(request);
    ensureNr1VisualFixtures();
  });

  test('Colaboradora com NR-1 habilitado abre runtime COPSOQ', async ({ page }) => {
    await loginUI(page, DEMO_NR1_COLLAB_EMAIL, ADMIN_PASS);
    await page.goto('/avaliacao-nr1');

    await expect(page).toHaveURL(/\/avaliacao-nr1$/);
    await expect(page.getByText('Avaliação Psicossocial', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Aceitar e continuar', exact: true })).toBeVisible();
    await page.screenshot({ path: evidencePath('pr7-nr1-colaboradora-runtime-desktop.png') });
  });
});

test.describe('Mobile — Visual UX', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeAll(async ({ request }) => {
    await ensureDemoRhUser(request);
  });

  test('Login page responsive', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Logo visible
    await expect(page.locator('img[alt*="UniHER"]').or(page.locator('text=UniHER'))).toBeVisible();
  });

  test('Dashboard mobile — sidebar accessible', async ({ page }) => {
    await loginUI(page, DEMO_RH_EMAIL, ADMIN_PASS);
    await openRhDashboard(page);
    await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
    const navigation = page.getByRole('dialog', { name: 'Navegação', exact: true });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('Buttons stack correctly on mobile', async ({ page }) => {
    await loginUI(page, DEMO_RH_EMAIL, ADMIN_PASS);
    await openRhDashboard(page);

    const inviteButton = page.getByRole('button', { name: 'Convidar', exact: true });
    const exportButton = page.getByRole('button', { name: 'Exportar CSV', exact: true });
    const [inviteBox, exportBox] = await Promise.all([
      inviteButton.boundingBox(),
      exportButton.boundingBox(),
    ]);
    expect(inviteBox).not.toBeNull();
    expect(exportBox).not.toBeNull();
    expect(inviteBox!.y + inviteBox!.height).toBeLessThanOrEqual(exportBox!.y);
    expect(Math.max(inviteBox!.x + inviteBox!.width, exportBox!.x + exportBox!.width)).toBeLessThanOrEqual(375);
  });
});
