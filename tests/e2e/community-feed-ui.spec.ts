import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
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

async function mockCommunityUi(page: Page) {
  await page.route('**/api/company', (route) => route.fulfill({
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

  test.beforeAll(async ({ request }) => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@uniher.com.br', password: 'Admin@2026' },
    });
    expect(adminLogin.ok(), await adminLogin.text()).toBeTruthy();
    const adminToken = extractAccessTokenFromSetCookie(adminLogin);

    const companyResponse = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: `Community UI ${suffix}`,
        cnpj: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-14),
        sector: 'Community UI QA',
        plan: 'trial',
      },
    });
    const companyBody = await companyResponse.text();
    expect(companyResponse.ok(), companyBody).toBeTruthy();
    const companyId = (JSON.parse(companyBody) as { company: { id: string } }).company.id;

    const email = `community-ui-${suffix}@empresa.com`;
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

  for (const viewport of viewports) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('renders the real feed contract without overflow or identity leakage', async ({ page, baseURL }, testInfo) => {
        test.setTimeout(60_000);
        expect(baseURL).toBeTruthy();
        await page.context().addCookies([{
          name: 'uniher-access-token',
          value: collaboratorToken,
          url: baseURL!,
        }]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await mockCommunityUi(page);

        await page.goto('/comunidade');
        await expect(page.getByRole('heading', { name: 'Conteúdos da sua empresa' })).toBeVisible();
        await expect(page.locator('article').first().getByText('Aurora Trabalho')).toBeVisible();
        await expect(page.getByRole('tab')).toHaveCount(5);
        await expect(page.getByRole('tab', { name: 'Para você' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('<strong>Respire por alguns instantes.</strong>')).toBeVisible();
        await expect(page.locator('article strong')).toHaveCount(0);
        await expect(page.getByRole('region', { name: 'Apoiadoras com nome autorizado' })).toHaveCount(0);

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

        const tabsAndActions = page.locator('[role="tab"], article button');
        const targetsAreLargeEnough = await tabsAndActions.evaluateAll((elements) => elements.every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        }));
        expect(targetsAreLargeEnough).toBe(true);

        const activeTab = page.getByRole('tab', { name: 'Sono' });
        await activeTab.focus();
        await expect(activeTab).toBeFocused();
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
          await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeVisible();
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
