import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import playwrightDbSafety from '../playwright-db-safety.cjs';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

test.use({
  baseURL: process.env.BASE_URL || `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || '3100'}`,
});

const viewports = [
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '768x900', width: 768, height: 900 },
  { name: '1440x1000', width: 1440, height: 1000 },
] as const;

const postA = {
  id: 'community-ui-post-a',
  title: 'Uma pausa possível no dia',
  summary: 'Uma orientação editorial realista para recuperar o foco com calma.',
  bodyText: '<strong>Respire por alguns instantes.</strong>',
  topic: 'pausas',
  readTimeMinutes: 4,
  imagePath: null,
  publishedAt: '2026-07-20T12:00:00.000Z',
  supportCount: 3,
  supportedByMe: false,
  savedByMe: false,
} as const;

const postB = {
  ...postA,
  id: 'community-ui-post-b',
  title: 'Movimento entre tarefas',
  summary: 'Movimentos simples ajudam a interromper longos períodos na mesma posição.',
  bodyText: 'Alongue ombros e braços sem forçar o corpo.',
  topic: 'movimento',
  readTimeMinutes: 3,
} as const;

const sleepPost = {
  ...postA,
  id: 'community-ui-post-sleep',
  title: 'Uma rotina de sono mais leve',
  summary: 'Pequenos rituais ajudam a preparar uma transição tranquila para o descanso.',
  bodyText: 'Reduza estímulos e reserve alguns minutos para desacelerar.',
  topic: 'sono',
} as const;

type Bounds = { x: number; y: number; width: number; height: number };

function overlaps(first: Bounds, second: Bounds): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

async function expectTextContrast(page: Page, selectors: string[], minimum = 4.5) {
  const results = await page.locator(selectors.join(',')).evaluateAll((elements) => {
    const parseColor = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return { red: channels[0] ?? 0, green: channels[1] ?? 0, blue: channels[2] ?? 0, alpha: channels[3] ?? 1 };
    };
    const luminance = ({ red, green, blue }: { red: number; green: number; blue: number }) => {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const backgroundFor = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        const color = parseColor(getComputedStyle(current).backgroundColor);
        if (color.alpha > 0) return color;
        current = current.parentElement;
      }
      return { red: 255, green: 255, blue: 255, alpha: 1 };
    };

    return elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map((element) => {
      const foreground = parseColor(getComputedStyle(element).color);
      const background = backgroundFor(element);
      const brighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return { label: element.textContent?.trim() || element.tagName, ratio: (brighter + 0.05) / (darker + 0.05) };
    });
  });

  expect(results.length).toBeGreaterThan(0);
  for (const result of results) {
    expect(result.ratio, `${result.label} contrast ratio`).toBeGreaterThanOrEqual(minimum);
  }
}

async function mockCommunityUi(page: Page) {
  await page.route('**/api/collaborator/company', (route) => route.fulfill({
    json: {
      company: {
        id: 'community-ui-company',
        name: 'Empresa Aurora',
        trade_name: 'Aurora Trabalho',
        logo_url: null,
      },
    },
  }));

  await page.route('**/api/collaborator/feed**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith('/supporters')) {
      await route.fulfill({ json: { names: ['Ana'], nextCursor: null } });
      return;
    }
    if (path.endsWith('/support')) {
      await route.fulfill({ json: {
        supportCount: request.method() === 'POST' ? 4 : 3,
        supportedByMe: request.method() === 'POST',
      } });
      return;
    }
    if (path.endsWith('/save')) {
      await route.fulfill({ json: { savedByMe: request.method() === 'POST' } });
      return;
    }

    if (url.searchParams.get('topic') === 'sono') {
      await route.fulfill({ json: {
        items: [sleepPost],
        nextCursor: null,
        scope: 'company',
        settings: { companyFeedEnabled: true },
      } });
      return;
    }

    const cursor = url.searchParams.get('cursor');
    await route.fulfill({ json: {
      items: cursor ? [postA, postB] : [postA],
      nextCursor: cursor ? null : 'community-ui-cursor-1',
      scope: 'company',
      settings: { companyFeedEnabled: true },
    } });
  });
}

test.describe('Collaborator community feed UI', () => {
  test.describe.configure({ mode: 'serial' });
  let collaboratorToken = '';
  let adminToken = '';
  let companyId = '';
  let safeDatabasePath = '';

  test.beforeAll(async ({ request }) => {
    safeDatabasePath = playwrightDbSafety.assertCommunityFeedFixtureEnvironment(process.env);
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@uniher.com.br', password: 'Admin@2026' },
    });
    expect(adminLogin.ok(), await adminLogin.text()).toBeTruthy();
    adminToken = extractAccessTokenFromSetCookie(adminLogin);

    const companyResponse = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: `Community Feed E2E UI ${suffix}`,
        trade_name: 'Aurora Trabalho',
        cnpj: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-14),
        sector: 'Community UI QA',
        plan: 'trial',
      },
    });
    const companyBody = await companyResponse.text();
    expect(companyResponse.ok(), companyBody).toBeTruthy();
    companyId = (JSON.parse(companyBody) as { company: { id: string } }).company.id;

    const email = `community-feed-test-ui-${suffix}@local.invalid`;
    const password = 'CommunityUi@2026';
    const userResponse = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: 'Colaboradora Community UI',
        email,
        password,
        role: 'colaboradora',
        company_id: companyId,
        mustChangePassword: false,
      },
    });
    expect(userResponse.ok(), await userResponse.text()).toBeTruthy();

    const collaboratorLogin = await request.post('/api/auth/login', { data: { email, password } });
    expect(collaboratorLogin.ok(), await collaboratorLogin.text()).toBeTruthy();
    collaboratorToken = extractAccessTokenFromSetCookie(collaboratorLogin);
    expect(collaboratorToken).toBeTruthy();

    const tourResponse = await request.patch('/api/users/me/preferences', {
      headers: { Authorization: `Bearer ${collaboratorToken}` },
      data: { preferences: { first_access_tour_completed: '1' } },
    });
    expect(tourResponse.ok(), await tourResponse.text()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    if (!companyId || !adminToken) return;
    const cleanupResponse = await request.delete(`/api/admin/companies/${encodeURIComponent(companyId)}`, {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
    });
    expect(cleanupResponse.ok(), await cleanupResponse.text()).toBeTruthy();
  });

  for (const viewport of viewports) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('renders the real feed contract without overflow or identity leakage', async ({ page, baseURL }, testInfo) => {
        test.setTimeout(60_000);
        expect(baseURL).toBeTruthy();
        expect(path.basename(safeDatabasePath)).toBe('uniher-playwright.db');
        await page.context().addCookies([{
          name: 'uniher-access-token',
          value: collaboratorToken,
          url: baseURL!,
        }]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mockCommunityUi(page);

        const companyIdentityRequest = page.waitForRequest((request) => (
          new URL(request.url()).pathname === '/api/collaborator/company'
        ));
        await page.goto('/comunidade');
        await companyIdentityRequest;
        await expect(page.getByRole('heading', { name: 'Conteúdos da sua empresa' })).toBeVisible();
        await expect(page.locator('article').first().getByText('Aurora Trabalho')).toBeVisible();
        await expect(page.getByRole('tab')).toHaveCount(5);
        const firstTab = page.getByRole('tab', { name: 'Para você' });
        await expect(firstTab).toHaveAttribute('aria-selected', 'true');
        await firstTab.click();
        await page.keyboard.press('ArrowLeft');
        await expect(page.getByRole('tab', { name: 'Movimento' })).toBeFocused();
        await expect(page.getByRole('tab', { name: 'Movimento' })).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('ArrowRight');
        await expect(firstTab).toBeFocused();
        await expect(firstTab).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('End');
        await expect(page.getByRole('tab', { name: 'Movimento' })).toBeFocused();
        await page.keyboard.press('Home');
        await expect(firstTab).toBeFocused();
        await expect(firstTab).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('<strong>Respire por alguns instantes.</strong>')).toBeVisible();
        await expect(page.locator('article strong')).toHaveCount(0);
        await expect(page.getByRole('region', { name: 'Apoiadoras com nome autorizado' })).toHaveCount(0);

        const mainHeading = page.getByRole('heading', { name: 'Conteúdos da sua empresa' });
        const sidebar = page.locator('aside').first();
        if (viewport.width <= 768) {
          const topbar = page.locator('header').first();
          const [headingBounds, topbarBounds] = await Promise.all([mainHeading.boundingBox(), topbar.boundingBox()]);
          expect(headingBounds).not.toBeNull();
          expect(topbarBounds).not.toBeNull();
          expect(overlaps(headingBounds!, topbarBounds!)).toBe(false);

          await page.getByRole('button', { name: 'Abrir navegação' }).click();
          const drawer = page.getByRole('dialog', { name: 'Navegação' });
          const [drawerBounds, coveredHeadingBounds] = await Promise.all([drawer.boundingBox(), mainHeading.boundingBox()]);
          expect(drawerBounds).not.toBeNull();
          expect(coveredHeadingBounds).not.toBeNull();
          expect(overlaps(drawerBounds!, coveredHeadingBounds!)).toBe(true);
          await expect(page.locator('#main-content').locator('..')).toHaveAttribute('inert', '');
          expect(drawerBounds!.x).toBeGreaterThanOrEqual(0);
          expect(drawerBounds!.x + drawerBounds!.width).toBeLessThanOrEqual(viewport.width);
          await page.getByRole('button', { name: 'Fechar navegação' }).click();
          await expect(drawer).toBeHidden();
        } else {
          const [headingBounds, sidebarBounds] = await Promise.all([mainHeading.boundingBox(), sidebar.boundingBox()]);
          expect(headingBounds).not.toBeNull();
          expect(sidebarBounds).not.toBeNull();
          expect(overlaps(headingBounds!, sidebarBounds!)).toBe(false);
        }

        await page.getByRole('button', { name: 'Ver apoiadoras' }).click();
        const supportersRegion = page.getByRole('region', { name: 'Apoiadoras com nome autorizado' });
        await expect(supportersRegion.getByText('Ana')).toBeVisible();
        await expect(page.getByText(/nomes aparecem somente com consentimento/i)).toBeVisible();
        await expect(page.getByText(/apoios permanecem anônimos/i)).toBeVisible();

        await page.getByRole('button', { name: 'Apoiar' }).click();
        await expect(page.getByRole('button', { name: 'Apoiado', exact: true })).toBeVisible();
        await expect(page.getByText('4 pessoas apoiaram')).toBeVisible();
        await page.getByRole('button', { name: 'Salvar' }).click();
        await expect(page.getByRole('button', { name: 'Salvo' })).toBeVisible();

        await page.getByRole('button', { name: 'Carregar mais' }).click();
        await expect(page.getByRole('heading', { name: postB.title })).toBeVisible();
        await expect(page.getByRole('heading', { name: postA.title })).toHaveCount(1);
        await expect(page.getByText('Você chegou ao fim das publicações.')).toBeVisible();

        await page.getByRole('tab', { name: 'Sono' }).click();
        await expect(page.getByRole('heading', { name: sleepPost.title })).toBeVisible();
        await expect(page.getByRole('heading', { name: postA.title })).toHaveCount(0);

        await expectTextContrast(page, [
          '[role="tab"][aria-selected="true"]',
          '#community-feed-panel article h2',
          '#community-feed-panel article p[class*="text-[var(--platform-ink)]"]',
          '#community-feed-panel article button[aria-pressed]',
        ]);

        const tabsAndActions = page.locator('[role="tab"], article button');
        const targetsAreLargeEnough = await tabsAndActions.evaluateAll((elements) => elements.every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        }));
        expect(targetsAreLargeEnough).toBe(true);

        const activeTab = page.getByRole('tab', { name: 'Sono' });
        await activeTab.click();
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
        await expect(activeTab).toBeFocused();
        await expect(activeTab).toHaveAttribute('aria-selected', 'true');
        const transitionDuration = await activeTab.evaluate((element) => getComputedStyle(element).transitionDuration);
        expect(Number.parseFloat(transitionDuration)).toBeLessThanOrEqual(0.001);

        const widths = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(widths.body).toBeLessThanOrEqual(widths.viewport);
        expect(widths.document).toBeLessThanOrEqual(widths.viewport);

        if (viewport.width <= 768) {
          const mobileNav = page.getByRole('navigation', { name: 'Navegação mobile' });
          await expect(mobileNav).toBeVisible();
          const endOfFeed = page.getByText('Você chegou ao fim das publicações.');
          await endOfFeed.evaluate((element) => element.scrollIntoView({ block: 'end' }));
          const [endBounds, navBounds] = await Promise.all([endOfFeed.boundingBox(), mobileNav.boundingBox()]);
          expect(endBounds).not.toBeNull();
          expect(navBounds).not.toBeNull();
          expect(overlaps(endBounds!, navBounds!)).toBe(false);
        } else {
          await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeHidden();
        }

        await page.screenshot({
          path: testInfo.outputPath(`community-feed-${viewport.name}.png`),
          fullPage: true,
        });
      });
    });
  }
});
