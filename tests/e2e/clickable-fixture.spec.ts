import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

type SmokeRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';
type FixtureStatus = 'PASS' | 'REVIEW' | 'FAIL';

interface BlockedControl {
  profileRole: SmokeRole;
  route: string;
  classification: string;
  label: string;
  text?: string | null;
  ariaLabel?: string | null;
  disabled?: boolean;
}

interface FixtureResult {
  lane: 'home' | 'session' | 'disabled' | 'wellbeing' | 'education';
  role: SmokeRole;
  route: string;
  label: string;
  status: FixtureStatus;
  beforeUrl?: string;
  afterUrl?: string;
  error?: string;
}

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASS = 'Admin@2026';
const CREDENTIALS: Record<SmokeRole, { email: string; password: string }> = {
  admin: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  rh: { email: 'rh.visual@eduardaeyurimarketingltda.com.br', password: ADMIN_PASS },
  lideranca: { email: 'lideranca.visual@eduardaeyurimarketingltda.com.br', password: ADMIN_PASS },
  colaboradora: { email: 'nr1.visual@eduardaeyurimarketingltda.com.br', password: ADMIN_PASS },
};

const REPO_ROOT = path.basename(process.cwd()) === 'tests'
  ? path.dirname(process.cwd())
  : process.cwd();
const SOURCE_PATH = path.join(
  REPO_ROOT,
  'docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/blocked-controls.json',
);
const EVIDENCE_DIR = path.join(
  REPO_ROOT,
  'docs/superpowers/evidence/local-clickable-fixture-shell-session-5d68e2b-2026-07-30',
);

function loadControls(): readonly BlockedControl[] {
  return JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8')) as BlockedControl[];
}

function uniqueByRoute(controls: readonly BlockedControl[]): readonly BlockedControl[] {
  const seen = new Set<string>();
  return controls.filter((control) => {
    const key = `${control.profileRole}|${control.route}|${control.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function relativeUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

async function apiLogin(request: APIRequestContext, role: SmokeRole): Promise<string> {
  return apiLoginWithCredentials(request, CREDENTIALS[role]);
}

async function apiLoginWithCredentials(
  request: APIRequestContext,
  credentials: { email: string; password: string },
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: credentials,
  });
  expect(response.ok(), `${credentials.email} login failed: ${await response.text()}`).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token, `${credentials.email} login did not return access cookie`).toBeTruthy();
  return token;
}

async function authenticatedPage(
  browser: Browser,
  request: APIRequestContext,
  baseURL: string,
  role: SmokeRole,
): Promise<Page> {
  const token = await apiLogin(request, role);
  const context = await browser.newContext({ baseURL });
  await context.addCookies([{ name: 'uniher-access-token', value: token, url: baseURL }]);
  return context.newPage();
}

async function authenticatedPageWithCredentials(
  browser: Browser,
  request: APIRequestContext,
  baseURL: string,
  credentials: { email: string; password: string },
): Promise<Page> {
  const token = await apiLoginWithCredentials(request, credentials);
  const context = await browser.newContext({ baseURL });
  await context.addCookies([{ name: 'uniher-access-token', value: token, url: baseURL }]);
  return context.newPage();
}

async function createCompany(request: APIRequestContext, adminToken: string, suffix: string): Promise<string> {
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: `Empresa Clickable Fixture ${suffix}`,
      cnpj: `55.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
      sector: 'Saude',
      plan: 'pro',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.company.id as string;
}

async function createCollaborator(
  request: APIRequestContext,
  adminToken: string,
  input: { companyId: string; email: string; password: string; name: string },
): Promise<void> {
  const response = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: 'colaboradora',
      company_id: input.companyId,
      mustChangePassword: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function markFirstAccessTourComplete(
  request: APIRequestContext,
  credentials: { email: string; password: string },
): Promise<void> {
  const token = await apiLoginWithCredentials(request, credentials);
  const response = await request.patch('/api/users/me/preferences', {
    headers: { Cookie: `uniher-access-token=${token}` },
    data: { preferences: { first_access_tour_completed: '1' } },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function closePage(page: Page): Promise<void> {
  await page.context().close().catch(() => undefined);
}

function writeReport(results: readonly FixtureResult[]): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_PATH,
    scope: 'Local fixture validation for global home, session/logout, disabled, collaborator wellbeing and reading controls.',
    total: results.length,
    pass: results.filter((result) => result.status === 'PASS').length,
    review: results.filter((result) => result.status === 'REVIEW').length,
    fail: results.filter((result) => result.status === 'FAIL').length,
    byLane: ['home', 'session', 'disabled', 'wellbeing', 'education'].reduce<Record<string, { total: number; pass: number; review: number; fail: number }>>((acc, lane) => {
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
    '# UniHER local clickable fixture: shell/session',
    '',
    `Generated: ${summary.generatedAt}`,
    '',
    `Counts: total ${summary.total}, PASS ${summary.pass}, REVIEW ${summary.review}, FAIL ${summary.fail}`,
    '',
    '| Lane | Total | PASS | REVIEW | FAIL |',
    '|---|---:|---:|---:|---:|',
    ...Object.entries(summary.byLane).map(([lane, item]) => `| ${lane} | ${item.total} | ${item.pass} | ${item.review} | ${item.fail} |`),
    '',
    'Production was not used for this lane.',
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'summary.md'), `${markdown}\n`, 'utf8');
}

test.describe('blocked clickable local fixture: shell/session lanes', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(420_000);

  const controls = loadControls();
  const homeControls = uniqueByRoute(controls.filter((control) => control.ariaLabel?.includes('UniHER')));
  const sessionControls = uniqueByRoute(controls.filter((control) => control.classification === 'session'));
  const disabledControls = uniqueByRoute(controls.filter((control) => control.classification === 'disabled'));
  const collaboratorWellbeingControls = controls.filter((control) =>
    control.profileRole === 'colaboradora'
    && ['Fazer check-in', 'Fazer check-out', 'Muito bem', 'Bem', 'Neutra', 'Cansada', 'Sobrecarregada'].includes(control.label),
  );
  const collaboratorReadingControls = controls.filter((control) =>
    control.profileRole === 'colaboradora' && control.label === 'Registrar leitura',
  );
  const results: FixtureResult[] = [];
  const suffix = Date.now().toString().slice(-8);
  const fixtureCollaborator = {
    email: `clickable-colab-${suffix}@empresa.com`,
    password: 'Clickable@2026',
  };

  test.beforeAll(async ({ request }) => {
    const adminToken = await apiLogin(request, 'admin');
    const companyId = await createCompany(request, adminToken, suffix);
    await createCollaborator(request, adminToken, {
      companyId,
      email: fixtureCollaborator.email,
      password: fixtureCollaborator.password,
      name: `Clickable Colab ${suffix}`,
    });
    await markFirstAccessTourComplete(request, fixtureCollaborator);
  });

  test.afterAll(() => {
    writeReport(results);
  });

  test('global home buttons navigate without mutation-risk behavior', async ({ browser, request, baseURL }) => {
    expect(homeControls.length).toBe(76);
    const pages = new Map<SmokeRole, Page>();

    async function pageFor(role: SmokeRole): Promise<Page> {
      const existingPage = pages.get(role);
      if (existingPage) return existingPage;
      const page = await authenticatedPage(browser, request, baseURL!, role);
      pages.set(role, page);
      return page;
    }

    try {
      for (const control of homeControls) {
        const result: FixtureResult = {
          lane: 'home',
          role: control.profileRole,
          route: control.route,
          label: control.label,
          status: 'FAIL',
        };
        const page = await pageFor(control.profileRole);
        await page.goto(control.route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        result.beforeUrl = relativeUrl(page.url());
        await page.getByLabel(/Ir para o in.cio da UniHER/i).first().click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(250);
        result.afterUrl = relativeUrl(page.url());
        expect(result.afterUrl).toMatch(/^\/(?:auth)?(?:\?|$)|^\/$/);
        result.status = 'PASS';
        results.push(result);
      }
    } finally {
      await Promise.all([...pages.values()].map((page) => closePage(page)));
    }
  });

  test('logout/session controls end only the local fixture session', async ({ browser, request, baseURL }) => {
    expect(sessionControls.length).toBe(76);

    for (const control of sessionControls) {
      const result: FixtureResult = {
        lane: 'session',
        role: control.profileRole,
        route: control.route,
        label: control.label,
        status: 'FAIL',
      };
      const page = await authenticatedPage(browser, request, baseURL!, control.profileRole);
      try {
        await page.goto(control.route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        result.beforeUrl = relativeUrl(page.url());
        await page.getByRole('button', { name: control.label }).first().click();
        await page.waitForURL(/\/$/, { timeout: 10000 });
        const landingUrl = relativeUrl(page.url());
        await page.goto('/admin', { waitUntil: 'domcontentloaded' });
        await page.waitForURL(/\/auth(?:\?|$)/, { timeout: 10000 });
        result.afterUrl = `${landingUrl} -> ${relativeUrl(page.url())}`;
        result.status = 'PASS';
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        results.push(result);
        await closePage(page);
      }
    }
  });

  test('disabled controls are present and non-interactive in the local fixture', async ({ browser, request, baseURL }) => {
    expect(disabledControls.length).toBe(25);
    const pages = new Map<SmokeRole, Page>();

    async function pageFor(role: SmokeRole): Promise<Page> {
      const existingPage = pages.get(role);
      if (existingPage) return existingPage;
      const page = await authenticatedPage(browser, request, baseURL!, role);
      pages.set(role, page);
      return page;
    }

    try {
      for (const control of disabledControls) {
        const result: FixtureResult = {
          lane: 'disabled',
          role: control.profileRole,
          route: control.route,
          label: control.label,
          status: 'FAIL',
        };
        const page = await pageFor(control.profileRole);
        await page.goto(control.route, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
        result.beforeUrl = relativeUrl(page.url());
        const locator = control.ariaLabel
          ? page.getByLabel(control.ariaLabel).first()
          : page.getByRole('button', { name: control.label }).first();
        if (await locator.count() === 0) {
          result.afterUrl = relativeUrl(page.url());
          result.status = 'REVIEW';
          result.error = 'disabled control from production inventory was not present in the local fixture route';
          results.push(result);
          continue;
        }
        await expect(locator).toBeVisible();
        if (!(await locator.isDisabled())) {
          result.afterUrl = relativeUrl(page.url());
          result.status = 'FAIL';
          result.error = 'control was present but not disabled in the local fixture';
          results.push(result);
          continue;
        }
        result.afterUrl = relativeUrl(page.url());
        result.status = 'PASS';
        results.push(result);
      }
    } finally {
      await Promise.all([...pages.values()].map((page) => closePage(page)));
    }
    expect(results.filter((result) => result.lane === 'disabled' && result.status === 'FAIL')).toEqual([]);
  });

  test('collaborator wellbeing buttons submit locally and become registered states', async ({ browser, request, baseURL }) => {
    expect(collaboratorWellbeingControls.length).toBe(56);
    const page = await authenticatedPageWithCredentials(browser, request, baseURL!, fixtureCollaborator);

    try {
      await page.goto('/colaboradora', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);

      const checkInResult: FixtureResult = {
        lane: 'wellbeing',
        role: 'colaboradora',
        route: '/colaboradora',
        label: 'Fazer check-in + mood',
        status: 'FAIL',
        beforeUrl: relativeUrl(page.url()),
      };
      const checkInRow = page.locator('li').filter({ hasText: 'Check-in de hoje' }).first();
      await checkInRow.getByRole('button', { name: 'Muito bem' }).click();
      await expect(checkInRow.getByRole('button', { name: 'Muito bem' })).toHaveAttribute('aria-pressed', 'true');
      const checkInResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith('/api/gamification/check-in') && response.request().method() === 'POST',
      );
      await checkInRow.getByRole('button', { name: 'Fazer check-in' }).click();
      const checkInResponse = await checkInResponsePromise;
      if (!checkInResponse.ok()) {
        throw new Error(`check-in failed: HTTP ${checkInResponse.status()} ${await checkInResponse.text()}`);
      }
      await expect(checkInRow.getByRole('button', { name: 'Check-in registrado' })).toBeDisabled();
      checkInResult.afterUrl = relativeUrl(page.url());
      checkInResult.status = 'PASS';
      results.push(checkInResult);

      const checkOutResult: FixtureResult = {
        lane: 'wellbeing',
        role: 'colaboradora',
        route: '/colaboradora',
        label: 'Fazer check-out + mood',
        status: 'FAIL',
        beforeUrl: relativeUrl(page.url()),
      };
      const checkOutRow = page.locator('li').filter({ hasText: 'Check-out do dia' }).first();
      await checkOutRow.getByRole('button', { name: 'Cansada' }).click();
      await expect(checkOutRow.getByRole('button', { name: 'Cansada' })).toHaveAttribute('aria-pressed', 'true');
      const checkOutResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith('/api/wellbeing/check-out') && response.request().method() === 'POST',
      );
      await checkOutRow.getByRole('button', { name: 'Fazer check-out' }).click();
      const checkOutResponse = await checkOutResponsePromise;
      if (!checkOutResponse.ok()) {
        throw new Error(`check-out failed: HTTP ${checkOutResponse.status()} ${await checkOutResponse.text()}`);
      }
      await expect(checkOutRow.getByRole('button', { name: 'Check-out registrado' })).toBeDisabled();
      checkOutResult.afterUrl = relativeUrl(page.url());
      checkOutResult.status = 'PASS';
      results.push(checkOutResult);

      const status = await request.get('/api/gamification/streak-status', {
        headers: { Cookie: `uniher-access-token=${await apiLoginWithCredentials(request, fixtureCollaborator)}` },
      });
      expect(status.ok(), await status.text()).toBe(true);
      const statusBody = await status.json();
      expect(statusBody).toMatchObject({
        checkedInToday: true,
        checkedOutToday: true,
        checkInMood: 'muito_bem',
        checkOutMood: 'cansada',
      });
    } finally {
      await closePage(page);
    }
  });

  test('collaborator reading button is classified from the local fixture route state', async ({ browser, request, baseURL }) => {
    expect(collaboratorReadingControls.length).toBe(8);
    const page = await authenticatedPageWithCredentials(browser, request, baseURL!, fixtureCollaborator);
    const result: FixtureResult = {
      lane: 'education',
      role: 'colaboradora',
      route: '/colaboradora',
      label: 'Registrar leitura',
      status: 'FAIL',
    };

    try {
      await page.goto('/colaboradora', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      result.beforeUrl = relativeUrl(page.url());
      const registerButton = page.getByRole('button', { name: 'Registrar leitura' }).first();
      if (await registerButton.count() === 0) {
        result.afterUrl = relativeUrl(page.url());
        result.status = 'REVIEW';
        result.error = 'daily reading mission was not present in the local fixture route state';
        results.push(result);
        return;
      }

      await page.getByPlaceholder(/Conte brevemente/i).first().fill('Registro local de leitura educativa com mais de vinte caracteres.');
      const responsePromise = page.waitForResponse((response) =>
        /\/api\/gamification\/daily-missions\/[^/]+\/complete$/.test(new URL(response.url()).pathname)
        && response.request().method() === 'POST',
      );
      await registerButton.click();
      const response = await responsePromise;
      if (!response.ok()) {
        throw new Error(`reading completion failed: HTTP ${response.status()} ${await response.text()}`);
      }
      await expect(page.getByRole('status')).toContainText('Progresso educativo registrado');
      result.afterUrl = relativeUrl(page.url());
      result.status = 'PASS';
      results.push(result);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      results.push(result);
      throw error;
    } finally {
      await closePage(page);
    }
  });
});
