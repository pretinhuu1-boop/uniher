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
const DEMO_LEADERSHIP_EMAIL = 'lideranca.visual@eduardaeyurimarketingltda.com.br';
const DEMO_COMPANY_CNPJ = '00.000.000/0001-00';
const DEMO_NR1_COLLAB_EMAIL = 'nr1.visual@eduardaeyurimarketingltda.com.br';
const REPO_ROOT = path.basename(process.cwd()) === 'tests'
  ? path.dirname(process.cwd())
  : process.cwd();
const EVIDENCE_DIR = path.resolve(REPO_ROOT, 'docs/superpowers/evidence');
const VISUAL_SMOKE_DIR = path.join(EVIDENCE_DIR, 'visual-ux-smoke-latest');

type VisualSmokeRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';

interface VisualSmokeRoute {
  role: VisualSmokeRole;
  name: string;
  route: string;
}

interface VisualSmokeViewport {
  name: string;
  width: number;
  height: number;
}

interface VisualSmokeResult extends VisualSmokeRoute {
  viewport: string;
  status: 'PASS' | 'FAIL';
  screenshot?: string;
  issues: string[];
}

const VISUAL_SMOKE_VIEWPORTS: readonly VisualSmokeViewport[] = [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-wide-1920', width: 1920, height: 1080 },
];
const VISUAL_SMOKE_ROLES: readonly VisualSmokeRole[] = ['admin', 'rh', 'lideranca', 'colaboradora'];

const VISUAL_SMOKE_ROUTES: readonly VisualSmokeRoute[] = [
  { role: 'admin', name: 'admin-visao-geral', route: '/admin' },
  { role: 'admin', name: 'admin-empresas', route: '/admin?tab=empresas' },
  { role: 'admin', name: 'admin-usuarios', route: '/admin?tab=usuarios' },
  { role: 'admin', name: 'admin-master', route: '/admin?tab=admin' },
  { role: 'admin', name: 'admin-sistema', route: '/admin?tab=sistema' },
  { role: 'admin', name: 'admin-produtos-modulos', route: '/produtos-modulos' },
  { role: 'admin', name: 'admin-relatorios', route: '/analytics-emails' },
  { role: 'admin', name: 'admin-saude-primaria', route: '/dashboard?section=saude-primaria' },
  { role: 'admin', name: 'admin-concierge', route: '/concierge' },
  { role: 'admin', name: 'admin-historico', route: '/dashboard?section=exames' },
  { role: 'admin', name: 'admin-educacao', route: '/comunidade/gerenciar' },
  { role: 'admin', name: 'admin-gamificacao', route: '/gamificacao-config' },
  { role: 'admin', name: 'admin-viva-sipat', route: '/viva-sipat' },
  { role: 'admin', name: 'admin-desenvolvimento-humano', route: '/desenvolvimento-humano' },
  { role: 'admin', name: 'admin-canal-denuncias', route: '/canal-denuncias' },
  { role: 'rh', name: 'rh-dashboard', route: '/dashboard' },
  { role: 'rh', name: 'rh-colaboradoras', route: '/colaboradoras-gestao' },
  { role: 'rh', name: 'rh-departamentos', route: '/departamentos' },
  { role: 'rh', name: 'rh-convites', route: '/convites' },
  { role: 'rh', name: 'rh-campanhas', route: '/campanhas' },
  { role: 'rh', name: 'rh-gestao-editorial', route: '/comunidade/gerenciar' },
  { role: 'rh', name: 'rh-company-profile', route: '/company-profile' },
  { role: 'rh', name: 'rh-notificacoes', route: '/notificacoes' },
  { role: 'rh', name: 'rh-saude-primaria', route: '/dashboard?section=saude-primaria' },
  { role: 'rh', name: 'rh-gamificacao', route: '/gamificacao-config' },
  { role: 'rh', name: 'rh-desafios-gerenciar', route: '/desafios/gerenciar' },
  { role: 'rh', name: 'rh-liga-gerenciar', route: '/liga/gerenciar' },
  { role: 'rh', name: 'rh-nr1', route: '/nr1' },
  { role: 'rh', name: 'rh-viva-sipat', route: '/viva-sipat' },
  { role: 'rh', name: 'rh-desenvolvimento-humano', route: '/desenvolvimento-humano' },
  { role: 'rh', name: 'rh-canal-denuncias', route: '/canal-denuncias' },
  { role: 'lideranca', name: 'lideranca-dashboard', route: '/dashboard' },
  { role: 'lideranca', name: 'lideranca-campanhas', route: '/campanhas' },
  { role: 'colaboradora', name: 'colab-home', route: '/colaboradora' },
  { role: 'colaboradora', name: 'colab-semaforo', route: '/semaforo' },
  { role: 'colaboradora', name: 'colab-agenda', route: '/agenda' },
  { role: 'colaboradora', name: 'colab-comunidade', route: '/comunidade' },
  { role: 'colaboradora', name: 'colab-conquistas', route: '/conquistas' },
  { role: 'colaboradora', name: 'colab-campanhas', route: '/campanhas' },
  { role: 'colaboradora', name: 'colab-notificacoes', route: '/notificacoes' },
  { role: 'colaboradora', name: 'colab-configuracoes', route: '/configuracoes' },
  { role: 'colaboradora', name: 'colab-objetivos', route: '/objetivos' },
  { role: 'colaboradora', name: 'colab-desafios', route: '/desafios' },
  { role: 'colaboradora', name: 'colab-liga', route: '/liga' },
  { role: 'colaboradora', name: 'colab-nr1-shell', route: '/nr1' },
  { role: 'colaboradora', name: 'colab-avaliacao-nr1', route: '/avaliacao-nr1' },
  { role: 'colaboradora', name: 'colab-viva-sipat', route: '/viva-sipat' },
  { role: 'colaboradora', name: 'colab-desenvolvimento-humano', route: '/desenvolvimento-humano' },
  { role: 'colaboradora', name: 'colab-canal-denuncias', route: '/canal-denuncias' },
];

function evidencePath(filename: string): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  return path.join(EVIDENCE_DIR, filename);
}

function visualSmokePath(filename: string): string {
  fs.mkdirSync(VISUAL_SMOKE_DIR, { recursive: true });
  return path.join(VISUAL_SMOKE_DIR, filename);
}

function routeIsImplemented(route: string): boolean {
  const pathname = route.split('?')[0];
  const segments = pathname.split('/').filter(Boolean);
  const routePage = path.join(REPO_ROOT, 'src', 'app', '(platform)', ...segments, 'page.tsx');
  return fs.existsSync(routePage);
}

function implementedVisualSmokeRoutes(): readonly VisualSmokeRoute[] {
  return VISUAL_SMOKE_ROUTES.filter((route) => routeIsImplemented(route.route));
}

async function waitForSidebarMotion(page: Page): Promise<void> {
  await page.waitForTimeout(240);
}

async function waitForRouteSettled(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
}

function loginCredentialsForRole(role: VisualSmokeRole): { email: string; password: string } {
  if (role === 'admin') return { email: ADMIN_EMAIL, password: ADMIN_PASS };
  if (role === 'rh') return { email: DEMO_RH_EMAIL, password: ADMIN_PASS };
  if (role === 'lideranca') return { email: DEMO_LEADERSHIP_EMAIL, password: ADMIN_PASS };
  return { email: DEMO_NR1_COLLAB_EMAIL, password: ADMIN_PASS };
}

function screenshotFilename(viewport: string, role: VisualSmokeRole, name: string): string {
  return `${viewport}-${role}-${name}.png`;
}

function writeVisualSmokeReport(results: readonly VisualSmokeResult[]): void {
  const generatedAt = new Date().toISOString();
  const passCount = results.filter((result) => result.status === 'PASS').length;
  const failCount = results.length - passCount;
  const routes = [...new Set(results.map((result) => `${result.role}:${result.route}`))].length;
  const viewports = [...new Set(results.map((result) => result.viewport))];
  const markdown = [
    '# UniHER visual UX smoke matrix',
    '',
    `Generated: ${generatedAt}`,
    `Counts: total ${results.length}, PASS ${passCount}, FAIL ${failCount}`,
    `Routes: ${routes}`,
    `Viewports: ${viewports.join(', ')}`,
    '',
    '| Status | Viewport | Role | Screen | Route | Screenshot | Issues |',
    '|---|---|---|---|---|---|---|',
    ...results.map((result) => [
      result.status,
      result.viewport,
      result.role,
      result.name,
      result.route,
      result.screenshot ?? '-',
      result.issues.length > 0 ? result.issues.join('<br>') : '-',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
  ].join('\n');

  fs.writeFileSync(visualSmokePath('screen-smoke-report.md'), markdown, 'utf8');
  fs.writeFileSync(visualSmokePath('screen-smoke-report.json'), JSON.stringify({
    generatedAt,
    counts: { total: results.length, pass: passCount, fail: failCount },
    viewports,
    results,
  }, null, 2), 'utf8');
}

async function collectRouteGeometryIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rootWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    );

    if (rootWidth > viewportWidth + 2) {
      issues.push(`root horizontal overflow ${rootWidth}px > ${viewportWidth}px`);
    }

    const visible = (element: Element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && rect.width > 0
        && rect.height > 0;
    };

    const clippedElements = Array.from(document.querySelectorAll<HTMLElement>(
      'main a, main button, main h1, main h2, main h3, nav[aria-label="Navegação mobile"] a',
    ))
      .filter(visible)
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .slice(0, 5)
      .map((element) => (element.textContent ?? element.getAttribute('aria-label') ?? element.tagName).trim().replace(/\s+/g, ' ').slice(0, 80));

    for (const label of clippedElements) {
      issues.push(`possible clipped text: ${label || 'unlabelled element'}`);
    }

    const bottomNav = document.querySelector<HTMLElement>('nav[aria-label="Navegação mobile"]');
    if (bottomNav && visible(bottomNav)) {
      const navRect = bottomNav.getBoundingClientRect();
      if (navRect.bottom > viewportHeight + 1 || navRect.left < -1 || navRect.right > viewportWidth + 1) {
        issues.push('bottom nav escapes viewport');
      }

      const navLinks = Array.from(bottomNav.querySelectorAll<HTMLElement>('a')).filter(visible);
      for (let index = 0; index < navLinks.length; index += 1) {
        const current = navLinks[index].getBoundingClientRect();
        if (current.bottom > navRect.bottom + 1 || current.top < navRect.top - 1) {
          issues.push(`bottom nav item ${index + 1} escapes nav bounds`);
        }
        for (let nextIndex = index + 1; nextIndex < navLinks.length; nextIndex += 1) {
          const next = navLinks[nextIndex].getBoundingClientRect();
          const overlaps = current.left < next.right
            && current.right > next.left
            && current.top < next.bottom
            && current.bottom > next.top;
          if (overlaps) issues.push(`bottom nav items ${index + 1}/${nextIndex + 1} overlap`);
        }
      }

      const main = document.querySelector<HTMLElement>('main');
      if (main) {
        const mainStyle = window.getComputedStyle(main);
        const workspace = main.parentElement instanceof HTMLElement ? main.parentElement : null;
        const workspaceStyle = workspace ? window.getComputedStyle(workspace) : null;
        const mainPadding = Number.parseFloat(mainStyle.paddingBottom || '0');
        const workspacePadding = Number.parseFloat(workspaceStyle?.paddingBottom || '0');
        if (Math.max(mainPadding, workspacePadding) + 1 < navRect.height) {
          issues.push(`bottom nav may occlude content: padding ${Math.max(mainPadding, workspacePadding)}px < nav ${Math.round(navRect.height)}px`);
        }
      }
    }

    return issues;
  });
}

async function collectSidebarGeometryIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    const sidebar = document.querySelector<HTMLElement>('aside[role="dialog"], aside[aria-label]');
    const navigation = sidebar?.querySelector<HTMLElement>('nav[aria-label="Navegação principal"]') ?? null;
    const footer = sidebar?.querySelector<HTMLElement>('[class*="footer"]') ?? null;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const visible = (element: Element | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && rect.width > 0
        && rect.height > 0;
    };

    if (!visible(sidebar)) return ['sidebar shell is not visible'];

    const sidebarRect = sidebar.getBoundingClientRect();
    if (sidebarRect.left < -1 || sidebarRect.top < -1 || sidebarRect.right > viewportWidth + 1 || sidebarRect.bottom > viewportHeight + 1) {
      issues.push('sidebar shell escapes viewport');
    }

    if (!visible(navigation)) {
      issues.push('sidebar navigation is not visible');
    }

    if (!visible(footer)) {
      issues.push('sidebar footer is not visible');
    }

    if (visible(navigation) && visible(footer)) {
      const navRect = navigation.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      if (navRect.bottom > footerRect.top + 1) {
        issues.push('sidebar navigation overlaps footer');
      }
      if (footerRect.bottom > sidebarRect.bottom + 1) {
        issues.push('sidebar footer escapes shell');
      }
    }

    const clippedLabels = Array.from(sidebar.querySelectorAll<HTMLElement>('a, button, [class*="brand"], [class*="company"], [class*="user"]'))
      .filter(visible)
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .slice(0, 5)
      .map((element) => (element.textContent ?? element.getAttribute('aria-label') ?? element.tagName).trim().replace(/\s+/g, ' ').slice(0, 80));

    for (const label of clippedLabels) {
      issues.push(`sidebar possible clipped text: ${label || 'unlabelled element'}`);
    }

    return issues;
  });
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
  const rhLoginPayload = await rhLoginRes.json() as {
    user?: { firstAccessTourCompleted?: boolean };
  };
  const rhCookie = extractAccessTokenFromSetCookie(rhLoginRes);
  expect(rhCookie).toBeTruthy();
  const rhHeaders = { Cookie: `uniher-access-token=${rhCookie}` };

  if (rhLoginPayload.user?.firstAccessTourCompleted !== true) {
    const preferencesRes = await request.patch('/api/users/me/preferences', {
      headers: rhHeaders,
      data: { preferences: { first_access_tour_completed: '1' } },
    });
    expect(preferencesRes.ok(), `Tour RH não foi concluído: HTTP ${preferencesRes.status()}`).toBeTruthy();
  }

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

async function ensureDemoLeadershipUser(request: APIRequestContext): Promise<void> {
  assertVisualUxFixtureHostIsLoopback();
  const adminLoginRes = await request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  expect(adminLoginRes.ok(), `Login admin falhou: HTTP ${adminLoginRes.status()}`).toBeTruthy();

  const adminCookie = extractAccessTokenFromSetCookie(adminLoginRes);
  expect(adminCookie).toBeTruthy();
  const demoCompanyId = await findDemoCompanyId(request, adminCookie);
  expect(demoCompanyId).toBeTruthy();

  const userRes = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${adminCookie}` },
    data: {
      name: 'Lideranca Visual',
      email: DEMO_LEADERSHIP_EMAIL,
      password: ADMIN_PASS,
      role: 'lideranca',
      company_id: demoCompanyId,
      mustChangePassword: false,
      also_collaborator: true,
    },
  });
  expect([200, 409]).toContain(userRes.status());
  ensureDemoLeadershipDepartment();

  const leadershipLoginRes = await request.post('/api/auth/login', {
    data: { email: DEMO_LEADERSHIP_EMAIL, password: ADMIN_PASS },
  });
  expect(leadershipLoginRes.ok(), `Login lideranca falhou: HTTP ${leadershipLoginRes.status()}`).toBeTruthy();
  const leadershipLoginPayload = await leadershipLoginRes.json() as {
    user?: { firstAccessTourCompleted?: boolean };
  };
  const leadershipCookie = extractAccessTokenFromSetCookie(leadershipLoginRes);
  expect(leadershipCookie).toBeTruthy();

  if (leadershipLoginPayload.user?.firstAccessTourCompleted !== true) {
    const preferencesRes = await request.patch('/api/users/me/preferences', {
      headers: { Cookie: `uniher-access-token=${leadershipCookie}` },
      data: { preferences: { first_access_tour_completed: '1' } },
    });
    expect(preferencesRes.ok(), `Tour lideranca nao foi concluido: HTTP ${preferencesRes.status()}`).toBeTruthy();
  }
}

function ensureDemoLeadershipDepartment(): void {
  const db = openPlaywrightDatabase();
  try {
    const company = db.prepare("SELECT id FROM companies WHERE cnpj = ?").get(DEMO_COMPANY_CNPJ) as { id: string } | undefined;
    if (!company) throw new Error('Empresa demo visual nao encontrada para a lideranca.');

    let department = db.prepare(`
      SELECT id
      FROM departments
      WHERE company_id = ?
      ORDER BY name ASC
      LIMIT 1
    `).get(company.id) as { id: string } | undefined;

    if (!department) {
      db.prepare(`
        INSERT INTO departments (id, company_id, name, color)
        VALUES ('dept_demo_visual_ops', ?, 'Operacoes', '#3E7D5A')
        ON CONFLICT(id) DO UPDATE SET
          company_id = excluded.company_id,
          name = excluded.name,
          color = excluded.color
      `).run(company.id);
      department = { id: 'dept_demo_visual_ops' };
    }

    db.prepare(`
      UPDATE users
      SET department_id = ?
      WHERE email = ?
        AND company_id = ?
        AND role = 'lideranca'
    `).run(department.id, DEMO_LEADERSHIP_EMAIL, company.id);
  } finally {
    db.close();
  }
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
    const moduleFixtureRows = [
      ['primary_health', 'enabled'],
      ['concierge', 'requires_contract'],
      ['education', 'enabled'],
      ['achievements', 'enabled'],
      ['nr1', 'enabled'],
      ['sipat', 'locked'],
      ['human_development', 'requires_contract'],
      ['denunciation', 'partner_managed'],
    ] as const;

    const upsertModule = db.prepare(`
      INSERT INTO company_modules (
        id, company_id, module_slug, module_state, visible, notes, created_at, updated_at, updated_by
      ) VALUES (
        @id,
        @companyId,
        @moduleSlug,
        @moduleState,
        1,
        'Visual smoke fixture for redesign route matrix',
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
    `);

    for (const [moduleSlug, moduleState] of moduleFixtureRows) {
      upsertModule.run({
        id: `visual-${moduleSlug}-module`,
        companyId: company.id,
        moduleSlug,
        moduleState,
        now,
      });
    }

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
  const logoutBtn = page.locator('button:has-text("Sair da Conta"), button:has-text("Sair da conta"), button:has-text("Sair da Plataforma")').first();
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

  test('Sidebar — Admin Master expõe conta pessoal sem duplicar Configurações da plataforma', async () => {
    await expect(page.getByRole('link', { name: 'Notificações', exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Conta pessoal', exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Configurações', exact: true })).toHaveCount(1);
    await expect(page.locator('button:has-text("Sair da Plataforma")').first()).toBeVisible();
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
    await expect(page.getByRole('link', { name: 'Meu Bem-Estar', exact: true })).toHaveAttribute('aria-current', 'page');
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
    ensureNr1VisualFixtures();
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
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: evidencePath('wave3-mobile-rh-sidebar.png'), fullPage: true });
    await navigation.getByRole('navigation', { name: 'Navegação principal', exact: true })
      .evaluate(element => { element.scrollTop = element.scrollHeight; });
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'Notificações', exact: true })).toBeVisible();
    await expect(navigation.locator('button').filter({ hasText: 'Sair da Conta' })).toBeVisible();
    await page.screenshot({ path: evidencePath('wave3-mobile-rh-sidebar-bottom.png'), fullPage: true });
  });

  test('Admin mobile sidebar evidence', async ({ page }) => {
    await loginUI(page, ADMIN_EMAIL, ADMIN_PASS);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Painel UniHER', exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();

    const navigation = page.getByRole('dialog', { name: 'Navegação', exact: true });
    await expect(navigation).toBeVisible();
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'Dashboard geral', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: evidencePath('wave3-mobile-admin-sidebar.png'), fullPage: true });
    await navigation.getByRole('navigation', { name: 'Navegação principal', exact: true })
      .evaluate(element => { element.scrollTop = element.scrollHeight; });
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'Configurações Gerais', exact: true })).toBeVisible();
    await expect(navigation.locator('button').filter({ hasText: 'Sair da Plataforma' })).toBeVisible();
    await page.screenshot({ path: evidencePath('wave3-mobile-admin-sidebar-bottom.png'), fullPage: true });
  });

  test('Colaboradora mobile sidebar evidence', async ({ page }) => {
    await loginUI(page, DEMO_NR1_COLLAB_EMAIL, ADMIN_PASS);
    await page.goto('/colaboradora');
    await expect(page.getByRole('heading', { name: 'Minha jornada', exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();

    const navigation = page.getByRole('dialog', { name: 'Navegação', exact: true });
    await expect(navigation).toBeVisible();
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'Meu Bem-Estar', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: evidencePath('wave3-mobile-colaboradora-sidebar.png'), fullPage: true });
    await navigation.getByRole('navigation', { name: 'Navegação principal', exact: true })
      .evaluate(element => { element.scrollTop = element.scrollHeight; });
    await waitForSidebarMotion(page);
    await expect(navigation.getByRole('link', { name: 'NR-1', exact: true })).toBeVisible();
    await expect(navigation.locator('button').filter({ hasText: 'Sair da Conta' })).toBeVisible();
    await page.screenshot({ path: evidencePath('wave3-mobile-colaboradora-sidebar-bottom.png'), fullPage: true });
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

test.describe('Final visual promotion smoke @visual-smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    await ensureDemoRhUser(request);
    await ensureDemoLeadershipUser(request);
    ensureNr1VisualFixtures();
  });

  test('route and viewport matrix is reproducible', async ({ browser }) => {
    test.setTimeout(420000);

    fs.rmSync(VISUAL_SMOKE_DIR, { recursive: true, force: true });
    fs.mkdirSync(VISUAL_SMOKE_DIR, { recursive: true });

    const routes = implementedVisualSmokeRoutes();
    expect(routes.length, 'visual smoke must have implemented routes to audit').toBeGreaterThan(0);

    const results: VisualSmokeResult[] = [];

    for (const viewport of VISUAL_SMOKE_VIEWPORTS) {
      for (const role of VISUAL_SMOKE_ROLES) {
        const credentials = loginCredentialsForRole(role);
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const consoleIssues: string[] = [];

        page.on('console', (message) => {
          if (message.type() === 'error') consoleIssues.push(message.text());
        });
        page.on('pageerror', (error) => {
          consoleIssues.push(error.message);
        });

        try {
          await loginUI(page, credentials.email, credentials.password);
          await page.evaluate(() => sessionStorage.removeItem('uniher-view-mode')).catch(() => undefined);

          for (const route of routes.filter((item) => item.role === role)) {
            const issues: string[] = [];
            const screenshot = screenshotFilename(viewport.name, role, route.name);
            consoleIssues.length = 0;

            try {
              await page.goto(route.route);
              await waitForRouteSettled(page);

              const currentUrl = new URL(page.url());
              const currentPath = `${currentUrl.pathname}${currentUrl.search}`;
              if (currentPath !== route.route) {
                issues.push(`unexpected navigation: ${currentPath}`);
              }

              issues.push(...await collectRouteGeometryIssues(page));

              if (consoleIssues.length > 0) {
                issues.push(...consoleIssues.slice(0, 5).map((message) => `console error: ${message.slice(0, 160)}`));
              }

              if (process.env.VISUAL_UX_CAPTURE_SCREENSHOTS === '1') {
                await page.screenshot({ path: visualSmokePath(screenshot), fullPage: true });
              }
            } catch (error) {
              issues.push(error instanceof Error ? error.message : String(error));
            }

            results.push({
              ...route,
              viewport: viewport.name,
              status: issues.length === 0 ? 'PASS' : 'FAIL',
              screenshot: process.env.VISUAL_UX_CAPTURE_SCREENSHOTS === '1' ? screenshot : undefined,
              issues,
            });
          }
        } finally {
          await page.close();
        }
      }
    }

    writeVisualSmokeReport(results);

    const failures = results
      .filter((result) => result.status === 'FAIL')
      .map((result) => `${result.viewport} ${result.role} ${result.route}: ${result.issues.join('; ')}`);
    expect(failures).toEqual([]);
  });

  test('sidebar top bottom and bottom nav geometry are guarded', async ({ browser }) => {
    test.setTimeout(240000);

    const issues: string[] = [];
    const sidebarViewports = VISUAL_SMOKE_VIEWPORTS;

    for (const viewport of sidebarViewports) {
      for (const role of VISUAL_SMOKE_ROLES) {
        const credentials = loginCredentialsForRole(role);
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        const homeRoute = role === 'admin' ? '/admin' : role === 'colaboradora' ? '/colaboradora' : '/dashboard';
        const isMobileSidebar = viewport.width <= 768;

        try {
          await loginUI(page, credentials.email, credentials.password);
          await page.goto(homeRoute);
          await waitForRouteSettled(page);
          if (isMobileSidebar) {
            await page.getByRole('button', { name: 'Abrir navegação', exact: true }).click();
          }

          const navigation = isMobileSidebar
            ? page.getByRole('dialog', { name: 'Navegação', exact: true })
            : page.locator('aside[aria-label="Navegação principal"]').first();
          await expect(navigation).toBeVisible();
          await waitForSidebarMotion(page);

          const topIssues = await collectSidebarGeometryIssues(page);
          issues.push(...topIssues.map((issue) => `${viewport.name} ${role} sidebar top: ${issue}`));
          await page.screenshot({
            path: visualSmokePath(`${viewport.name}-${role}-sidebar-top.png`),
            fullPage: true,
          });

          await navigation.getByRole('navigation', { name: 'Navegação principal', exact: true })
            .evaluate((element) => { element.scrollTop = element.scrollHeight; });
          await waitForSidebarMotion(page);

          const bottomIssues = await collectSidebarGeometryIssues(page);
          issues.push(...bottomIssues.map((issue) => `${viewport.name} ${role} sidebar bottom: ${issue}`));
          await page.screenshot({
            path: visualSmokePath(`${viewport.name}-${role}-sidebar-bottom.png`),
            fullPage: true,
          });

          if (isMobileSidebar) {
            await page.keyboard.press('Escape');
            await expect(navigation).toBeHidden();
          }

          const routeIssues = await collectRouteGeometryIssues(page);
          issues.push(...routeIssues.map((issue) => `${viewport.name} ${role} closed route: ${issue}`));
        } finally {
          await page.close();
        }
      }
    }

    fs.writeFileSync(visualSmokePath('sidebar-geometry-report.json'), JSON.stringify({
      generatedAt: new Date().toISOString(),
      viewports: sidebarViewports,
      issues,
    }, null, 2), 'utf8');

    expect(issues).toEqual([]);
  });
});
