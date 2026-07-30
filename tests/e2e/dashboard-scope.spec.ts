import Database from 'better-sqlite3';
import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  expectNoRecursiveKeys,
  expectPrivateResponse,
  extractAccessTokenFromSetCookie,
} from './helpers/auth';
import playwrightDbSafety from '../playwright-db-safety.cjs';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

type ProtectedMetric =
  | { status: 'visible'; value: number }
  | { status: 'suppressed'; reason: string; message: string };

function isSetupLoopbackHostname(hostname: string) {
  const ipv4Octet = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
  const ipv4Loopback = new RegExp(`^127(?:\\.${ipv4Octet}){3}$`);
  return hostname === 'localhost' || hostname === '[::1]' || ipv4Loopback.test(hostname);
}

function assertSetupBaseUrlIsLocal(baseURL?: string) {
  expect(baseURL, 'dashboard-scope requires Playwright baseURL').toBeTruthy();
  const hostname = new URL(baseURL!).hostname;
  const isLoopback = isSetupLoopbackHostname(hostname);
  expect(
    isLoopback,
    'dashboard-scope creates setup users and seeds the local Playwright DB; non-loopback BASE_URL is blocked.',
  ).toBe(true);
}

function openPlaywrightDatabase(): Database.Database {
  const databasePath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
  return new Database(databasePath);
}

function assertProtectedMetric(metric: unknown, label: string) {
  expect(metric, `${label} must be an object`).toEqual(expect.any(Object));
  const candidate = metric as Partial<ProtectedMetric> & Record<string, unknown>;
  if (candidate.status === 'visible') {
    expect(Object.keys(candidate).sort(), `${label} visible metric shape`).toEqual(['status', 'value']);
    expect(candidate.value, `${label} visible value`).toEqual(expect.any(Number));
    return;
  }

  expect(candidate.status, `${label} status`).toBe('suppressed');
  expect(Object.keys(candidate).sort(), `${label} suppressed metric shape`).toEqual(['message', 'reason', 'status']);
  expect(candidate.reason, `${label} reason`).toMatch(/^(minimum_cohort|complementary|not_computable)$/);
  expect(candidate.message, `${label} message`).toEqual(expect.any(String));
  expect(candidate).not.toHaveProperty('value');
}

function assertDashboardProjectionIsProtected(body: any) {
  expect(Object.keys(body).sort()).toEqual([
    'ageDistribution',
    'departments',
    'examActivitySeries',
    'filters',
    'metrics',
    'wellbeingSeries',
  ]);
  expect(Object.keys(body.filters).sort()).toEqual(
    expect.arrayContaining(['period']),
  );
  expect(Object.keys(body.filters).sort().every((key) => ['departmentId', 'period'].includes(key))).toBe(true);
  expect(Object.keys(body.metrics).sort()).toEqual([
    'campaignParticipation',
    'engagement',
    'examActivity',
    'healthRisk',
    'roi',
    'wellbeingCheckIn',
    'wellbeingCheckOut',
  ]);
  for (const [key, metric] of Object.entries(body.metrics)) {
    assertProtectedMetric(metric, `metrics.${key}`);
  }
  expect(body.metrics.healthRisk).toEqual(
    expect.objectContaining({ status: 'suppressed', reason: 'not_computable' }),
  );
  expect(body.metrics.healthRisk).not.toHaveProperty('value');

  for (const department of body.departments) {
    expect(Object.keys(department).sort()).toEqual(['color', 'id', 'metric', 'name']);
    assertProtectedMetric(department.metric, `departments.${department.id}`);
  }
  for (const bucket of body.ageDistribution) {
    expect(Object.keys(bucket).sort()).toEqual(['color', 'label', 'metric']);
    assertProtectedMetric(bucket.metric, `ageDistribution.${bucket.label}`);
  }
  for (const point of body.examActivitySeries) {
    expect(Object.keys(point).sort()).toEqual(['metric', 'period']);
    expect(point.period).toMatch(/^\d{4}-\d{2}$/);
    assertProtectedMetric(point.metric, `examActivitySeries.${point.period}`);
  }
  for (const point of body.wellbeingSeries) {
    expect(Object.keys(point).sort()).toEqual(['checkIn', 'checkOut', 'period']);
    expect(point.period).toMatch(/^\d{4}-\d{2}$/);
    assertProtectedMetric(point.checkIn, `wellbeingSeries.${point.period}.checkIn`);
    assertProtectedMetric(point.checkOut, `wellbeingSeries.${point.period}.checkOut`);
  }
  expectNoRecursiveKeys(body, /users?|participants?|employeeCount|emails?|cpf|birth|password/i);
}

function seedDashboardExamContributors(input: {
  companyId: string;
  departmentId: string;
  prefix: string;
  count: number;
}) {
  const db = openPlaywrightDatabase();
  try {
    const admin = db.prepare('SELECT password_hash FROM users WHERE email = ?')
      .get(ADMIN_EMAIL) as { password_hash: string } | undefined;
    if (!admin) throw new Error('Seeded Playwright admin was not found');
    const completedDate = new Date().toISOString().slice(0, 10);
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, company_id, department_id, name, email, password_hash, role,
        approved, blocked, must_change_password, also_collaborator, birth_date
      ) VALUES (?, ?, ?, ?, ?, ?, 'colaboradora', 1, 0, 0, 0, ?)
    `);
    const insertExam = db.prepare(`
      INSERT INTO user_exams (id, user_id, exam_name, status, completed_date)
      VALUES (?, ?, 'Hemograma', 'completed', ?)
    `);

    db.transaction(() => {
      for (let index = 1; index <= input.count; index += 1) {
        const userId = `${input.prefix}-dashboard-user-${index}`;
        insertUser.run(
          userId,
          input.companyId,
          input.departmentId,
          `Dashboard Contributor ${input.prefix} ${index}`,
          `${userId}@local.invalid`,
          admin.password_hash,
          '1990-01-01',
        );
        insertExam.run(`${userId}-exam`, userId, completedDate);
      }
    })();
  } finally {
    db.close();
  }
}

async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token).toBeTruthy();
  return token;
}

async function createCompany(request: APIRequestContext, adminToken: string, suffix: string): Promise<string> {
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: `Empresa Dashboard Scope ${suffix}`,
      cnpj: `77.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
      sector: 'Saude',
      plan: 'pro',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.company.id as string;
}

async function createRoleUser(
  request: APIRequestContext,
  adminToken: string,
  input: {
    companyId: string;
    email: string;
    password: string;
    role: 'rh' | 'lideranca';
    name: string;
  },
): Promise<string> {
  const response = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      company_id: input.companyId,
      mustChangePassword: false,
      also_collaborator: input.role === 'lideranca',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.id as string;
}

async function createDepartment(request: APIRequestContext, rhToken: string, name: string): Promise<string> {
  const response = await request.post('/api/departments', {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: { name },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  return body.id as string;
}

async function assignDepartment(request: APIRequestContext, rhToken: string, userId: string, departmentId: string) {
  const response = await request.patch(`/api/rh/users/${userId}`, {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: {
      action: 'update_profile',
      department_id: departmentId,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function getDashboard(request: APIRequestContext, token: string, query = '') {
  return request.get(`/api/dashboard${query}`, {
    headers: { Cookie: `uniher-access-token=${token}` },
  });
}

test('dashboard-scope setup guard only allows exact loopback hostnames', () => {
  for (const hostname of ['localhost', '[::1]', '127.0.0.1', '127.255.255.255']) {
    expect(isSetupLoopbackHostname(hostname), `${hostname} should be accepted`).toBe(true);
  }

  for (const hostname of ['127.example.com', '127.0.0.1.evil.test', '127.999.0.1', 'example.com']) {
    expect(isSetupLoopbackHostname(hostname), `${hostname} should be rejected`).toBe(false);
  }
});

test.describe('Dashboard scope API parity', () => {
  test.describe.configure({ mode: 'serial' });

  const suffix = Date.now().toString().slice(-8);
  const password = 'DashboardScope@2026';
  const rhEmail = `rh-dashboard-${suffix}@empresa.com`;
  const leaderEmail = `leader-dashboard-${suffix}@empresa.com`;
  const leaderNoDeptEmail = `leader-nodept-dashboard-${suffix}@empresa.com`;
  const foreignRhEmail = `rh-dashboard-foreign-${suffix}@empresa.com`;

  let adminToken: string;
  let rhToken: string;
  let leaderToken: string;
  let leaderNoDeptToken: string;
  let companyId: string;
  let foreignCompanyId: string;
  let departmentAId: string;
  let departmentBId: string;
  let departmentBName: string;
  let foreignDepartmentId: string;
  let foreignDepartmentName: string;

  test.beforeAll(async ({ request, baseURL }) => {
    assertSetupBaseUrlIsLocal(baseURL);
    adminToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    companyId = await createCompany(request, adminToken, suffix);
    foreignCompanyId = await createCompany(request, adminToken, `${suffix}8`);

    await createRoleUser(request, adminToken, {
      companyId,
      email: rhEmail,
      password,
      role: 'rh',
      name: `RH Dashboard ${suffix}`,
    });
    const leaderId = await createRoleUser(request, adminToken, {
      companyId,
      email: leaderEmail,
      password,
      role: 'lideranca',
      name: `Leader Dashboard ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: leaderNoDeptEmail,
      password,
      role: 'lideranca',
      name: `Leader Dashboard No Dept ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: foreignRhEmail,
      password,
      role: 'rh',
      name: `RH Dashboard Foreign ${suffix}`,
    });

    rhToken = await apiLogin(request, rhEmail, password);
    departmentAId = await createDepartment(request, rhToken, `Dashboard Produto ${suffix}`);
    departmentBName = `Dashboard Operacoes ${suffix}`;
    departmentBId = await createDepartment(request, rhToken, departmentBName);
    await assignDepartment(request, rhToken, leaderId, departmentAId);
    seedDashboardExamContributors({
      companyId,
      departmentId: departmentAId,
      prefix: `dashboard-a-${suffix}`,
      count: 10,
    });
    seedDashboardExamContributors({
      companyId,
      departmentId: departmentBId,
      prefix: `dashboard-b-${suffix}`,
      count: 11,
    });

    leaderToken = await apiLogin(request, leaderEmail, password);
    leaderNoDeptToken = await apiLogin(request, leaderNoDeptEmail, password);

    const foreignRhToken = await apiLogin(request, foreignRhEmail, password);
    foreignDepartmentName = `Dashboard Foreign ${suffix}`;
    foreignDepartmentId = await createDepartment(request, foreignRhToken, foreignDepartmentName);
    seedDashboardExamContributors({
      companyId: foreignCompanyId,
      departmentId: foreignDepartmentId,
      prefix: `dashboard-foreign-${suffix}`,
      count: 7,
    });
  });

  test('Admin Master must choose an explicit company scope', async ({ request }) => {
    const response = await getDashboard(request, adminToken);

    expect(response.status()).toBe(400);
    expectPrivateResponse(response);
    await expect(response.json()).resolves.toEqual({
      error: 'COMPANY_SCOPE_REQUIRED',
      message: 'Selecione uma empresa antes de acessar o dashboard RH.',
    });
  });

  test('Admin Master can read a protected dashboard only for the requested company', async ({ request }) => {
    const response = await getDashboard(request, adminToken, `?companyId=${companyId}&period=3m`);

    expect(response.ok(), await response.text()).toBe(true);
    expectPrivateResponse(response);
    const body = await response.json();
    expect(body.filters).toEqual({ period: '3m' });
    assertDashboardProjectionIsProtected(body);
    expect(body.metrics.examActivity).toEqual({ status: 'visible', value: 21 });
    expect(Object.keys(body.metrics).sort()).toEqual([
      'campaignParticipation',
      'engagement',
      'examActivity',
      'healthRisk',
      'roi',
      'wellbeingCheckIn',
      'wellbeingCheckOut',
    ]);
    expectNoRecursiveKeys(body, /password|cpf|ranking|points?|xp|league|badges?/i, [
      foreignCompanyId,
      foreignRhEmail,
      foreignDepartmentId,
      foreignDepartmentName,
      `dashboard-foreign-${suffix}`,
    ]);
  });

  test('RH cannot override dashboard company scope through query params', async ({ request }) => {
    const response = await getDashboard(request, rhToken, `?companyId=${foreignCompanyId}`);

    expect(response.status()).toBe(403);
    expectPrivateResponse(response);
    await expect(response.json()).resolves.toEqual({
      error: 'COMPANY_SCOPE_FORBIDDEN',
      message: 'O escopo de empresa do dashboard deve vir da sessão autenticada.',
    });
  });

  test('Leadership dashboard uses persisted department over requested department', async ({ request }) => {
    const response = await getDashboard(request, leaderToken, `?period=3m&departmentId=${departmentBId}`);

    expect(response.ok(), await response.text()).toBe(true);
    expectPrivateResponse(response);
    const body = await response.json();
    expect(body.filters).toEqual({ period: '3m', departmentId: departmentAId });
    assertDashboardProjectionIsProtected(body);
    expect(body.metrics.examActivity).toEqual({ status: 'visible', value: 10 });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(departmentBId);
    expect(serialized).not.toContain(departmentBName);
    expect(serialized).not.toContain(foreignDepartmentId);
    expect(serialized).not.toContain(foreignDepartmentName);
    expect(serialized).not.toContain(`dashboard-foreign-${suffix}`);
  });

  test('Leadership without department is blocked from dashboard', async ({ request }) => {
    const response = await getDashboard(request, leaderNoDeptToken);

    expect(response.status()).toBe(403);
    expectPrivateResponse(response);
    await expect(response.json()).resolves.toEqual({
      error: 'LEADERSHIP_DEPARTMENT_REQUIRED',
      message: 'Vincule a lideranca a um departamento antes de acessar o dashboard.',
    });
  });
});
