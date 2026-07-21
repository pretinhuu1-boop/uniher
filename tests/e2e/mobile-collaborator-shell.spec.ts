import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

test.describe('Mobile collaborator shell', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 375, height: 812 } });

  test('keeps the Admin shell without collaborator mobile navigation spacing', async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);

    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@uniher.com.br', password: 'Admin@2026' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = extractAccessTokenFromSetCookie(adminLogin);
    expect(adminToken).toBeTruthy();

    const baseUrl = String(testInfo.project.use.baseURL || 'http://127.0.0.1:3100');
    await page.context().addCookies([{
      name: 'uniher-access-token',
      value: adminToken,
      domain: new URL(baseUrl).hostname,
      path: '/',
    }]);

    await page.goto('/configuracoes');
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toHaveCount(0);
    await expect(page.locator('main#main-content')).toHaveCSS('padding-bottom', '48px');

    await page.goto('/comunidade');
    await expect(page.getByRole('heading', { name: 'Comunidade indisponível para este perfil' })).toBeVisible();
  });

  test('renders four destinations and preserves the mobile viewport', async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);

    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const uniqueCnpj = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-18);
    const adminLogin = await request.post('/api/auth/login', {
      data: { email: 'admin@uniher.com.br', password: 'Admin@2026' },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = extractAccessTokenFromSetCookie(adminLogin);
    expect(adminToken).toBeTruthy();

    const companyResponse = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: `Empresa Mobile ${suffix}`,
        cnpj: uniqueCnpj,
        sector: 'Mobile QA',
        plan: 'trial',
      },
    });
    const companyBody = await companyResponse.text();
    expect(companyResponse.ok(), companyBody).toBeTruthy();
    const companyId = (JSON.parse(companyBody) as { company: { id: string } }).company.id;

    const collaboratorEmail = `mobile-${suffix}@empresa.com`;
    const collaboratorPassword = 'MobileQa@2026';
    const collaboratorResponse = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: 'Colaboradora Mobile QA',
        email: collaboratorEmail,
        password: collaboratorPassword,
        role: 'colaboradora',
        company_id: companyId,
        mustChangePassword: false,
      },
    });
    expect(collaboratorResponse.ok()).toBeTruthy();

    const collaboratorLogin = await request.post('/api/auth/login', {
      data: { email: collaboratorEmail, password: collaboratorPassword },
    });
    expect(collaboratorLogin.ok()).toBeTruthy();
    const collaboratorToken = extractAccessTokenFromSetCookie(collaboratorLogin);
    expect(collaboratorToken).toBeTruthy();

    const firstAccessResponse = await request.patch('/api/users/me/preferences', {
      headers: { Authorization: `Bearer ${collaboratorToken}` },
      data: { preferences: { first_access_tour_completed: '1' } },
    });
    const firstAccessBody = await firstAccessResponse.text();
    expect(firstAccessResponse.ok(), firstAccessBody).toBeTruthy();

    const baseUrl = String(testInfo.project.use.baseURL || 'http://127.0.0.1:3100');
    await page.context().addCookies([{
      name: 'uniher-access-token',
      value: collaboratorToken,
      domain: new URL(baseUrl).hostname,
      path: '/',
    }]);

    await page.goto('/colaboradora');
    const mobileNav = page.getByRole('navigation', { name: 'Navegação mobile' });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page');
    await expect(mobileNav.getByRole('link', { name: 'Comunidade' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Jornada' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Perfil' })).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Comunidade' }).click();
    await expect(page).toHaveURL(/\/comunidade$/);
    await expect(page.getByRole('heading', { name: 'Um espaço seguro para a sua empresa' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A comunidade ainda não foi ativada' })).toBeVisible();

    await mobileNav.getByRole('link', { name: 'Jornada' }).click();
    await expect(page).toHaveURL(/\/colaboradora\?focus=journey$/);
    await expect(mobileNav.getByRole('link', { name: 'Jornada' })).toHaveAttribute('aria-current', 'page');
    let releaseCollaboratorResponse!: () => void;
    const collaboratorResponseGate = new Promise<void>((resolve) => {
      releaseCollaboratorResponse = resolve;
    });

    await page.route('**/api/collaborator', async (route) => {
      const response = await route.fetch();
      await collaboratorResponseGate;
      await route.fulfill({ response });
    });

    try {
      const reloadPromise = page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForRequest('**/api/collaborator');
      await expect(page.getByRole('heading', { name: 'Carregando sua jornada' })).toBeVisible();
      releaseCollaboratorResponse();
      await reloadPromise;

      const journeyTitle = page.locator('#journey-title');
      await expect(journeyTitle).toBeVisible();
      await expect(journeyTitle).toBeInViewport();
      const journeyTitleBounds = await journeyTitle.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
      const mobileTopbarBottom = await page.locator('header').first().evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, height: rect.height };
      });
      expect(mobileTopbarBottom.height).toBeGreaterThan(0);
      expect(journeyTitleBounds.top).toBeGreaterThanOrEqual(mobileTopbarBottom.bottom);
      const mobileBottomNavTop = await mobileNav.evaluate((element) => element.getBoundingClientRect().top);
      expect(journeyTitleBounds.bottom).toBeLessThanOrEqual(mobileBottomNavTop);
    } finally {
      releaseCollaboratorResponse();
      await page.unroute('**/api/collaborator');
    }

    await mobileNav.getByRole('link', { name: 'Perfil' }).click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    await expect(mobileNav.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');

    const widths = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);

    await page.screenshot({
      path: testInfo.outputPath('mobile-collaborator-shell.png'),
      fullPage: true,
    });
  });
});
