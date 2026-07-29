import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

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
      name: `Empresa Auth Redirect ${suffix}`,
      cnpj: `44.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
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
  input: { companyId: string; email: string; password: string; role: 'rh' | 'lideranca' | 'colaboradora'; name: string },
) {
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
}

async function markFirstAccessTourComplete(request: APIRequestContext, email: string, password: string) {
  const token = await apiLogin(request, email, password);
  const response = await request.patch('/api/users/me/preferences', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: { preferences: { first_access_tour_completed: '1' } },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function submitLogin(page: Page, email: string, password: string, targetPath: RegExp) {
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByRole('textbox', { name: 'Senha' });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar' }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), await loginResponse.text()).toBe(true);
  try {
    await page.waitForURL(targetPath, { timeout: 15000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      href: window.location.href,
      storedUser: window.localStorage.getItem('uniher-user'),
      sessionActive: window.sessionStorage.getItem('uniher-session-active'),
      bodyText: document.body.innerText.slice(0, 500),
    }));
    const cookies = await page.context().cookies();
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nstate=${JSON.stringify(state)}\ncookies=${JSON.stringify(cookies.map((cookie) => ({ name: cookie.name, domain: cookie.domain, path: cookie.path })))}`);
  }
}

test.describe('Auth redirect and first-access browser-flow parity', () => {
  test.describe.configure({ mode: 'serial' });

  const suffix = Date.now().toString().slice(-8);
  const password = 'AuthRedirect@2026';
  const rhEmail = `rh-auth-${suffix}@empresa.com`;
  const leaderEmail = `lider-auth-${suffix}@empresa.com`;
  const collaboratorEmail = `colab-auth-${suffix}@empresa.com`;
  const pendingTourEmail = `tour-auth-${suffix}@empresa.com`;

  let adminToken: string;
  let companyId: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    companyId = await createCompany(request, adminToken, suffix);
    await createRoleUser(request, adminToken, {
      companyId,
      email: rhEmail,
      password,
      role: 'rh',
      name: `RH Auth ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: leaderEmail,
      password,
      role: 'lideranca',
      name: `Lider Auth ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: collaboratorEmail,
      password,
      role: 'colaboradora',
      name: `Colab Auth ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: pendingTourEmail,
      password,
      role: 'rh',
      name: `Tour Auth ${suffix}`,
    });

    await markFirstAccessTourComplete(request, rhEmail, password);
    await markFirstAccessTourComplete(request, leaderEmail, password);
    await markFirstAccessTourComplete(request, collaboratorEmail, password);
  });

  test('admin ignores safe redirect and lands on admin shell', async ({ page }) => {
    await page.goto('/auth?redirect=%2Fdashboard');
    await submitLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD, /\/admin$/);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('RH honors safe internal redirect after completed first access', async ({ page }) => {
    await page.goto('/auth?redirect=%2Fcampanhas');
    await submitLogin(page, rhEmail, password, /\/campanhas$/);
    await expect(page).toHaveURL(/\/campanhas$/);
  });

  for (const [label, redirect] of [
    ['absolute external URL', 'https%3A%2F%2Fevil.test'],
    ['protocol-relative URL', '%2F%2Fevil.test'],
    ['double-encoded protocol-relative URL', '%252F%252Fevil.test'],
  ] as const) {
    test(`RH rejects unsafe redirect: ${label}`, async ({ page }) => {
      await page.goto(`/auth?redirect=${redirect}`);
      await submitLogin(page, rhEmail, password, /\/dashboard$/);
      await expect(page).toHaveURL(/\/dashboard$/);
    });
  }

  test('lideranca defaults to dashboard after completed first access', async ({ page }) => {
    await page.goto('/auth');
    await submitLogin(page, leaderEmail, password, /\/dashboard$/);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('colaboradora defaults to collaborator home after completed first access', async ({ page }) => {
    await page.goto('/auth');
    await submitLogin(page, collaboratorEmail, password, /\/colaboradora$/);
    await expect(page).toHaveURL(/\/colaboradora$/);
  });

  test('pending first-access tour overrides role redirect', async ({ page }) => {
    await page.goto('/auth?redirect=%2Fdashboard');
    await submitLogin(page, pendingTourEmail, password, /\/primeiro-acesso$/);
    await expect(page).toHaveURL(/\/primeiro-acesso$/);
  });

  test('existing authenticated session on auth redirect resolves through cookie-backed /me', async ({ page, context, baseURL }) => {
    await context.addCookies([{
      name: 'uniher-access-token',
      value: adminToken,
      url: baseURL!,
    }]);

    await page.goto('/auth?redirect=%2Fadmin');
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
  });
});
