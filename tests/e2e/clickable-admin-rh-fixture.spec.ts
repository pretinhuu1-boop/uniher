import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

type Role = 'admin' | 'rh';
type Status = 'PASS' | 'REVIEW' | 'FAIL';

interface Result {
  lane: 'admin_forms' | 'rh_navigation' | 'rh_forms';
  role: Role;
  route: string;
  label: string;
  status: Status;
  beforeUrl?: string;
  afterUrl?: string;
  evidence?: string;
  error?: string;
}

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASS = 'Admin@2026';
const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  rh: { email: 'rh.visual@eduardaeyurimarketingltda.com.br', password: ADMIN_PASS },
};

const REPO_ROOT = path.basename(process.cwd()) === 'tests'
  ? path.dirname(process.cwd())
  : process.cwd();
const EVIDENCE_DIR = path.join(
  REPO_ROOT,
  'docs/superpowers/evidence/local-clickable-fixture-admin-rh-bb0e3f2-2026-07-30',
);

async function apiLogin(
  request: APIRequestContext,
  credentials: { email: string; password: string },
): Promise<string> {
  const response = await request.post('/api/auth/login', { data: credentials });
  expect(response.ok(), `${credentials.email} login failed: ${await response.text()}`).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token, `${credentials.email} login did not return access cookie`).toBeTruthy();
  return token;
}

async function authenticatedPage(
  browser: Browser,
  request: APIRequestContext,
  baseURL: string,
  role: Role,
): Promise<Page> {
  const token = await apiLogin(request, CREDENTIALS[role]);
  const context = await browser.newContext({ baseURL });
  await context.addCookies([{ name: 'uniher-access-token', value: token, url: baseURL }]);
  return context.newPage();
}

async function markFirstAccessTourComplete(request: APIRequestContext, role: Role): Promise<void> {
  const token = await apiLogin(request, CREDENTIALS[role]);
  const response = await request.patch('/api/users/me/preferences', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: { preferences: { first_access_tour_completed: '1' } },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function createCompany(request: APIRequestContext, suffix: string): Promise<string> {
  const token = await apiLogin(request, CREDENTIALS.admin);
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const name = `Empresa Admin RH Fixture ${suffix}`;
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: {
      name,
      trade_name: name,
      cnpj: `56.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
      sector: 'Saude',
      plan: 'pro',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return name;
}

async function createRhDepartment(request: APIRequestContext, suffix: string): Promise<string> {
  const token = await apiLogin(request, CREDENTIALS.rh);
  const name = `Depto Fixture ${suffix}`;
  const response = await request.post('/api/rh/departments', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: { name, color: '#3E7D5A' },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return name;
}

function relativeUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function writeReport(results: readonly Result[]): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const lanes = ['admin_forms', 'rh_navigation', 'rh_forms'] as const;
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: 'Local fixture validation for non-destructive RH/Admin clickables that open forms, accordions, or navigation without submitting production mutations.',
    total: results.length,
    pass: results.filter((result) => result.status === 'PASS').length,
    review: results.filter((result) => result.status === 'REVIEW').length,
    fail: results.filter((result) => result.status === 'FAIL').length,
    byLane: lanes.reduce<Record<string, { total: number; pass: number; review: number; fail: number }>>((acc, lane) => {
      const laneResults = results.filter((result) => result.lane === lane);
      acc[lane] = {
        total: laneResults.length,
        pass: laneResults.filter((result) => result.status === 'PASS').length,
        review: laneResults.filter((result) => result.status === 'REVIEW').length,
        fail: laneResults.filter((result) => result.status === 'FAIL').length,
      };
      return acc;
    }, {}),
    reviewItems: results.filter((result) => result.status === 'REVIEW'),
    failures: results.filter((result) => result.status === 'FAIL'),
  };
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'results.json'), JSON.stringify({ summary, results }, null, 2), 'utf8');
  const markdown = [
    '# UniHER local clickable fixture: RH/Admin non-destructive controls',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Counts: total ${summary.total}, PASS ${summary.pass}, REVIEW ${summary.review}, FAIL ${summary.fail}`,
    '',
    '| Lane | Total | PASS | REVIEW | FAIL |',
    '|---|---:|---:|---:|---:|',
    ...Object.entries(summary.byLane).map(([lane, item]) => `| ${lane} | ${item.total} | ${item.pass} | ${item.review} | ${item.fail} |`),
    '',
    'Production was not used for this lane. Destructive controls remain intentionally unclicked.',
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'summary.md'), `${markdown}\n`, 'utf8');
}

test.describe('blocked clickable local fixture: RH/Admin non-destructive lanes', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(420_000);

  const results: Result[] = [];
  const suffix = Date.now().toString().slice(-8);
  let fixtureCompanyName = '';
  let fixtureDepartmentName = '';

  test.beforeAll(async ({ request }) => {
    await markFirstAccessTourComplete(request, 'admin');
    await markFirstAccessTourComplete(request, 'rh');
    fixtureCompanyName = await createCompany(request, suffix);
    fixtureDepartmentName = await createRhDepartment(request, suffix);
  });

  test.afterAll(() => {
    writeReport(results);
  });

  test('admin create/edit buttons open forms without submitting destructive actions', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'admin');
    try {
      await page.goto('/admin?tab=empresas');
      await expect(page.getByRole('button', { name: '+ Nova Empresa' })).toBeVisible();

      await page.getByRole('button', { name: '+ Nova Empresa' }).click();
      await expect(page.getByRole('heading', { name: 'Nova Empresa' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cadastrar Empresa' })).toBeDisabled();
      results.push({
        lane: 'admin_forms',
        role: 'admin',
        route: '/admin?tab=empresas',
        label: '+ Nova Empresa',
        status: 'PASS',
        beforeUrl: '/admin?tab=empresas',
        afterUrl: relativeUrl(page.url()),
        evidence: 'Create company form opened and submit remained disabled while empty.',
      });

      await page.getByRole('button', { name: 'Cancelar' }).first().click();
      await expect(page.getByText(fixtureCompanyName)).toBeVisible();
      await page.locator('div', { hasText: fixtureCompanyName }).getByRole('button', { name: 'Editar' }).first().click();
      await expect(page.getByText('Editar Empresa')).toBeVisible();
      results.push({
        lane: 'admin_forms',
        role: 'admin',
        route: '/admin?tab=empresas',
        label: 'Editar Empresa',
        status: 'PASS',
        evidence: 'Existing fixture company edit panel opened without clicking save or suspend.',
      });

      await page.goto('/admin?tab=usuarios');
      await page.getByRole('button', { name: /Novo usu.rio/i }).click();
      await expect(page.getByRole('heading', { name: /Novo usu.rio/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Criar usu.rio/i })).toBeDisabled();
      results.push({
        lane: 'admin_forms',
        role: 'admin',
        route: '/admin?tab=usuarios',
        label: '+ Novo usuario',
        status: 'PASS',
        evidence: 'Create user form opened and submit remained disabled while empty.',
      });

      await page.goto('/admin?tab=admin');
      await page.getByRole('button', { name: '+ Novo Admin Master' }).click();
      await expect(page.getByRole('heading', { name: 'Novo Admin Master' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Criar Admin Master' })).toBeDisabled();
      results.push({
        lane: 'admin_forms',
        role: 'admin',
        route: '/admin?tab=admin',
        label: '+ Novo Admin Master',
        status: 'PASS',
        evidence: 'Admin master form opened and submit remained disabled while empty.',
      });
    } finally {
      await page.context().close();
    }
  });

  test('RH invite controls navigate and expand without sending invites', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'rh');
    try {
      await page.goto('/dashboard');
      const beforeUrl = relativeUrl(page.url());
      await page.getByRole('button', { name: 'Convidar' }).click();
      await page.waitForURL('**/convites');
      await expect(page.getByRole('heading', { name: 'Convites' })).toBeVisible();
      results.push({
        lane: 'rh_navigation',
        role: 'rh',
        route: '/dashboard',
        label: 'Convidar',
        status: 'PASS',
        beforeUrl,
        afterUrl: relativeUrl(page.url()),
        evidence: 'Dashboard action navigated to the invite management route.',
      });

      await expect(page.getByRole('button', { name: '+ Convidar' })).toBeDisabled();
      results.push({
        lane: 'rh_forms',
        role: 'rh',
        route: '/convites',
        label: '+ Convidar',
        status: 'PASS',
        evidence: 'Invite submit is present but disabled until an email is provided.',
      });

      await page.getByRole('button', { name: /Convidar em massa/i }).click();
      await expect(page.locator('textarea[placeholder*="maria@empresa.com"]').first()).toBeVisible();
      results.push({
        lane: 'rh_forms',
        role: 'rh',
        route: '/convites',
        label: 'Convidar em massa',
        status: 'PASS',
        evidence: 'Bulk invite section expanded without submitting invite data.',
      });
    } finally {
      await page.context().close();
    }
  });

  test('RH department create/edit buttons open forms without submit/delete', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'rh');
    try {
      await page.goto('/departamentos');
      await page.getByRole('button', { name: '+ Novo Departamento' }).click();
      await expect(page.getByRole('heading', { name: 'Novo Departamento' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Criar Departamento' })).toBeDisabled();
      results.push({
        lane: 'rh_forms',
        role: 'rh',
        route: '/departamentos',
        label: '+ Novo Departamento',
        status: 'PASS',
        evidence: 'Create department form opened and submit remained disabled while empty.',
      });

      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.getByText(fixtureDepartmentName)).toBeVisible();
      const departmentRow = page
        .getByText(fixtureDepartmentName, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "px-6") and contains(@class, "py-4")][1]');
      await departmentRow.getByRole('button', { name: 'Editar' }).click();
      await expect(page.getByRole('heading', { name: 'Editar Departamento' })).toBeVisible();
      await expect(page.locator('input[type="text"]').first()).toHaveValue(fixtureDepartmentName);
      results.push({
        lane: 'rh_forms',
        role: 'rh',
        route: '/departamentos',
        label: 'Editar Departamento',
        status: 'PASS',
        evidence: 'Existing fixture department edit form opened without saving or deleting.',
      });
    } finally {
      await page.context().close();
    }
  });
});
