import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

type Role = 'admin' | 'rh';
type Status = 'PASS' | 'REVIEW' | 'FAIL';

interface Result {
  lane: 'company_state' | 'user_state' | 'department_delete';
  role: Role;
  route: string;
  label: string;
  status: Status;
  evidence?: string;
  error?: string;
}

interface CompanyFixture {
  id: string;
  name: string;
}

interface UserFixture {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface DepartmentFixture {
  id: string;
  name: string;
}

const ADMIN_PASS = 'Admin@2026';
const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin: { email: 'admin@uniher.com.br', password: ADMIN_PASS },
  rh: { email: 'rh.visual@eduardaeyurimarketingltda.com.br', password: ADMIN_PASS },
};

const REPO_ROOT = path.basename(process.cwd()) === 'tests'
  ? path.dirname(process.cwd())
  : process.cwd();
const EVIDENCE_DIR = path.join(
  REPO_ROOT,
  'docs/superpowers/evidence/local-clickable-fixture-destructive-8647cbf-2026-07-30',
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

async function createCompany(request: APIRequestContext, suffix: string): Promise<CompanyFixture> {
  const token = await apiLogin(request, CREDENTIALS.admin);
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const name = `Empresa Destructive Fixture ${suffix}`;
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: {
      name,
      trade_name: name,
      cnpj: `57.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
      sector: 'Saude',
      plan: 'pro',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { id: body.company.id as string, name };
}

async function createAdminManagedUser(
  request: APIRequestContext,
  companyId: string,
  suffix: string,
): Promise<UserFixture> {
  const token = await apiLogin(request, CREDENTIALS.admin);
  const fixture = {
    id: '',
    name: `User Destructive Fixture ${suffix}`,
    email: `destructive-${suffix}@empresa.com`,
    password: 'Destructive@2026',
  };
  const response = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: {
      name: fixture.name,
      email: fixture.email,
      password: fixture.password,
      role: 'rh',
      company_id: companyId,
      mustChangePassword: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { ...fixture, id: body.id as string };
}

async function createRhDepartment(request: APIRequestContext, suffix: string): Promise<DepartmentFixture> {
  const token = await apiLogin(request, CREDENTIALS.rh);
  const name = `Depto Delete Fixture ${suffix}`;
  const response = await request.post('/api/rh/departments', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: { name, color: '#3E7D5A' },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return { id: body.id as string, name };
}

async function getCompanyActive(request: APIRequestContext, companyId: string): Promise<number> {
  const token = await apiLogin(request, CREDENTIALS.admin);
  const response = await request.get(`/api/admin/companies/${companyId}`, {
    headers: { Cookie: `uniher-access-token=${token}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.company.is_active as number;
}

async function getAdminManagedUserBlocked(
  request: APIRequestContext,
  companyId: string,
  userId: string,
): Promise<number> {
  const token = await apiLogin(request, CREDENTIALS.admin);
  const response = await request.get(`/api/admin/companies/${companyId}/users`, {
    headers: { Cookie: `uniher-access-token=${token}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  const user = (body.users as Array<{ id: string; blocked: number }>).find((item) => item.id === userId);
  expect(user, `Fixture user ${userId} not found`).toBeTruthy();
  return user!.blocked;
}

async function expectDepartmentGone(request: APIRequestContext, departmentId: string): Promise<void> {
  const token = await apiLogin(request, CREDENTIALS.rh);
  const response = await request.get('/api/rh/departments', {
    headers: { Cookie: `uniher-access-token=${token}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  const match = (body.departments as Array<{ id: string }>).find((item) => item.id === departmentId);
  expect(match, `Department ${departmentId} should have been deleted`).toBeUndefined();
}

function writeReport(results: readonly Result[]): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const lanes = ['company_state', 'user_state', 'department_delete'] as const;
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: 'Local fixture validation for destructive or account-state RH/Admin clickables using disposable test records only.',
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
    '# UniHER local clickable fixture: destructive/account-state controls',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Counts: total ${summary.total}, PASS ${summary.pass}, REVIEW ${summary.review}, FAIL ${summary.fail}`,
    '',
    '| Lane | Total | PASS | REVIEW | FAIL |',
    '|---|---:|---:|---:|---:|',
    ...Object.entries(summary.byLane).map(([lane, item]) => `| ${lane} | ${item.total} | ${item.pass} | ${item.review} | ${item.fail} |`),
    '',
    'Production was not used for this lane. All clicks targeted disposable local fixture records.',
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'summary.md'), `${markdown}\n`, 'utf8');
}

test.describe('blocked clickable local fixture: destructive/account-state lanes', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(420_000);

  const results: Result[] = [];
  const suffix = Date.now().toString().slice(-8);
  let company: CompanyFixture;
  let user: UserFixture;
  let department: DepartmentFixture;

  test.beforeAll(async ({ request }) => {
    await markFirstAccessTourComplete(request, 'admin');
    await markFirstAccessTourComplete(request, 'rh');
    company = await createCompany(request, suffix);
    user = await createAdminManagedUser(request, company.id, suffix);
    department = await createRhDepartment(request, suffix);
  });

  test.afterAll(() => {
    writeReport(results);
  });

  test('admin company suspend/reactivate buttons mutate only the local fixture company', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'admin');
    try {
      await page.goto('/admin?tab=empresas');
      const companyRow = page
        .getByText(company.name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "border-b")][1]');
      await companyRow.getByRole('button', { name: 'Suspender' }).click();
      await expect.poll(() => getCompanyActive(request, company.id)).toBe(0);
      results.push({
        lane: 'company_state',
        role: 'admin',
        route: '/admin?tab=empresas',
        label: 'Suspender',
        status: 'PASS',
        evidence: 'Fixture company is_active changed to 0 after clicking Suspender.',
      });

      await expect(companyRow.getByRole('button', { name: 'Reativar' })).toBeVisible();
      await companyRow.getByRole('button', { name: 'Reativar' }).click();
      await expect.poll(() => getCompanyActive(request, company.id)).toBe(1);
      results.push({
        lane: 'company_state',
        role: 'admin',
        route: '/admin?tab=empresas',
        label: 'Reativar',
        status: 'PASS',
        evidence: 'Fixture company is_active returned to 1 after clicking Reativar.',
      });
    } finally {
      await page.context().close();
    }
  });

  test('admin user block/unblock/reset buttons mutate only the local fixture user', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'admin');
    try {
      await page.goto('/admin?tab=usuarios');
      const userEmailCell = page.getByRole('table').getByText(user.email, { exact: true });
      await expect(userEmailCell).toBeVisible();
      const userRow = userEmailCell.locator('xpath=ancestor::tr[1]');

      await userRow.getByRole('button', { name: 'Bloquear' }).click();
      await expect.poll(() => getAdminManagedUserBlocked(request, company.id, user.id)).toBe(1);
      results.push({
        lane: 'user_state',
        role: 'admin',
        route: '/admin?tab=usuarios',
        label: 'Bloquear',
        status: 'PASS',
        evidence: 'Fixture user blocked changed to 1 after clicking Bloquear.',
      });

      await expect(userRow.getByRole('button', { name: 'Desbloquear' })).toBeVisible();
      await userRow.getByRole('button', { name: 'Desbloquear' }).click();
      await expect.poll(() => getAdminManagedUserBlocked(request, company.id, user.id)).toBe(0);
      results.push({
        lane: 'user_state',
        role: 'admin',
        route: '/admin?tab=usuarios',
        label: 'Desbloquear',
        status: 'PASS',
        evidence: 'Fixture user blocked returned to 0 after clicking Desbloquear.',
      });

      const [resetResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/admin/users/${user.id}`)
          && response.request().method() === 'PATCH',
        ),
        userRow.getByRole('button', { name: 'Resetar Senha' }).click(),
      ]);
      expect(resetResponse.ok(), await resetResponse.text()).toBe(true);
      const resetBody = await resetResponse.json();
      expect(resetBody.passwordReset?.delivery).toBe('out_of_band_required');
      expect(resetBody.passwordReset?.mustChangePassword).toBe(true);
      results.push({
        lane: 'user_state',
        role: 'admin',
        route: '/admin?tab=usuarios',
        label: 'Resetar Senha',
        status: 'PASS',
        evidence: 'Reset click returned the out-of-band password reset contract without exposing a temporary password.',
      });
    } finally {
      await page.context().close();
    }
  });

  test('RH department delete button requires confirmation and deletes only the fixture department', async ({ browser, request, baseURL }) => {
    const page = await authenticatedPage(browser, request, baseURL!, 'rh');
    try {
      await page.goto('/departamentos');
      const departmentRow = page
        .getByText(department.name, { exact: true })
        .locator('xpath=ancestor::div[contains(@class, "px-6") and contains(@class, "py-4")][1]');

      await departmentRow.getByRole('button', { name: 'Excluir' }).click();
      await expect(departmentRow.getByRole('button', { name: 'Confirmar' })).toBeVisible();
      await departmentRow.getByRole('button', { name: 'Cancelar' }).click();
      await expect(departmentRow.getByRole('button', { name: 'Excluir' })).toBeVisible();
      results.push({
        lane: 'department_delete',
        role: 'rh',
        route: '/departamentos',
        label: 'Excluir confirmation',
        status: 'PASS',
        evidence: 'Delete click exposes Confirmar/Cancelar and cancel returns to Excluir.',
      });

      await departmentRow.getByRole('button', { name: 'Excluir' }).click();
      await departmentRow.getByRole('button', { name: 'Confirmar' }).click();
      await expectDepartmentGone(request, department.id);
      results.push({
        lane: 'department_delete',
        role: 'rh',
        route: '/departamentos',
        label: 'Confirmar',
        status: 'PASS',
        evidence: 'Fixture department was removed after confirmation.',
      });
    } finally {
      await page.context().close();
    }
  });
});
