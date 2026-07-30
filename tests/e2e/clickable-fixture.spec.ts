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
  lane: 'home' | 'session' | 'disabled';
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
  const response = await request.post('/api/auth/login', {
    data: CREDENTIALS[role],
  });
  expect(response.ok(), `${role} login failed: ${await response.text()}`).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token, `${role} login did not return access cookie`).toBeTruthy();
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

async function closePage(page: Page): Promise<void> {
  await page.context().close().catch(() => undefined);
}

function writeReport(results: readonly FixtureResult[]): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_PATH,
    scope: 'Local fixture validation for global home, session/logout and disabled clickable controls only.',
    total: results.length,
    pass: results.filter((result) => result.status === 'PASS').length,
    review: results.filter((result) => result.status === 'REVIEW').length,
    fail: results.filter((result) => result.status === 'FAIL').length,
    byLane: ['home', 'session', 'disabled'].reduce<Record<string, { total: number; pass: number; review: number; fail: number }>>((acc, lane) => {
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
  test.setTimeout(240_000);

  const controls = loadControls();
  const homeControls = uniqueByRoute(controls.filter((control) => control.ariaLabel?.includes('UniHER')));
  const sessionControls = uniqueByRoute(controls.filter((control) => control.classification === 'session'));
  const disabledControls = uniqueByRoute(controls.filter((control) => control.classification === 'disabled'));
  const results: FixtureResult[] = [];

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
});
