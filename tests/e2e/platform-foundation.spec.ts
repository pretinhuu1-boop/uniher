import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

async function authenticateAdmin(
  request: APIRequestContext,
  context: BrowserContext,
  baseURL: string,
) {
  const response = await request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(response.ok(), await response.text()).toBe(true);
  const accessToken = extractAccessTokenFromSetCookie(response);
  expect(accessToken).not.toBe('');

  await context.addCookies([
    {
      name: 'uniher-access-token',
      value: accessToken,
      url: baseURL,
    },
  ]);
}

async function openStableAdminShell(page: Page) {
  const systemResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/admin/system',
  );
  const companiesResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/admin/companies',
  );
  const notificationsResponse = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/api/notifications/count',
  );

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Painel UniHER' })).toBeVisible();
  await expect(page.locator('#main-content').getByText('Admin UniHER', { exact: true })).toBeVisible();

  const [system, companies, notifications] = await Promise.all([
    systemResponse,
    companiesResponse,
    notificationsResponse,
  ]);
  expect(system.ok(), await system.text()).toBe(true);
  expect(companies.ok(), await companies.text()).toBe(true);
  expect(notifications.ok(), await notifications.text()).toBe(true);
  await expect(page.getByText('Carregando...', { exact: true })).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeVisible();
}

async function stabilizeAdminOverview(page: Page) {
  await page.route('**/api/admin/system', route => route.fulfill({
    json: {
      companies: 1,
      users: 1,
      challenges: 5,
      badges: 6,
      campaigns: 0,
      notifications: 0,
      db_size_kb: 1024,
      uptime_seconds: 60,
      applied_migrations: [],
    },
  }));
  await page.route('**/api/admin/companies', route => route.fulfill({
    json: {
      companies: [{
        id: 'visual-company',
        name: 'UniHER',
        trade_name: null,
        cnpj: '00.000.000/0001-00',
        sector: null,
        plan: 'enterprise',
        contact_name: null,
        contact_email: null,
        logo_url: null,
        primary_color: null,
        secondary_color: null,
        is_active: 1,
        created_at: '2026-01-01T00:00:00.000Z',
        user_count: 0,
        department_count: 0,
      }],
      total: 1,
      limit: 50,
      offset: 0,
    },
  }));
  await page.route('**/api/notifications/count', route => route.fulfill({
    json: { unread: 0 },
  }));
}

test.describe('UniHER platform foundation', () => {
  test('owns the authenticated desktop shell and main content landmark', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin');

    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveCount(1);
    await expect(sidebar).toHaveCSS('border-right-color', 'rgba(255, 247, 236, 0.12)');

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(navigation).toHaveCount(1);
    await expect(navigation).toBeVisible();
    await expect(navigation).toHaveCSS('background-color', 'rgb(32, 24, 18)');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
  });

  test('opens an accessible mobile drawer without overflow and restores focus on Escape', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');

    const sidebar = page.locator('aside');
    const workspace = page.locator('#main-content').locator('..');
    await expect(sidebar).toHaveCount(1);
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await sidebar.evaluate((element) => element.setAttribute('data-sidebar-instance', 'original'));

    const menuButton = page.getByRole('button', { name: 'Abrir navegação' });
    await menuButton.click();

    const drawer = page.getByRole('dialog', { name: 'Navegação' });
    await expect(page.locator('aside')).toHaveCount(1);
    await expect(page.locator('aside[data-sidebar-instance="original"]')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(1);
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer).not.toHaveAttribute('inert', '');
    await expect(drawer).not.toHaveAttribute('aria-hidden', 'true');
    await expect(drawer).toBeVisible();
    await expect(workspace).toHaveAttribute('inert', '');
    await expect(drawer.getByRole('link').first()).toBeFocused();
    const transitionDuration = await drawer.evaluate(element =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
    expect(transitionDuration).toBeLessThanOrEqual(0.00001);

    const closeButton = drawer.getByRole('button', { name: 'Fechar navegação' });
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toHaveCSS('width', '44px');
    await expect(closeButton).toHaveCSS('height', '44px');

    const focusableElements = drawer.locator('a[href], button:not([disabled])');
    const firstFocusable = focusableElements.first();
    const lastFocusable = focusableElements.last();
    await firstFocusable.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(lastFocusable).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(firstFocusable).toBeFocused();

    const sidebarIds = await drawer.locator('[id]').evaluateAll((elements) =>
      elements.map((element) => element.id),
    );
    expect(new Set(sidebarIds).size).toBe(sidebarIds.length);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await closeButton.click();
    await expect(sidebar).toBeHidden();
    await expect(workspace).not.toHaveAttribute('inert', '');
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
    await expect(sidebar).not.toHaveAttribute('role', 'dialog');
    await expect(sidebar).not.toHaveAttribute('aria-modal', 'true');
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('aside[data-sidebar-instance="original"]')).toHaveCount(1);
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await expect(drawer).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 812 });
    await expect(page.getByRole('dialog', { name: 'Navegação' })).toHaveCount(0);
    await expect(sidebar).toBeVisible();
    await expect(workspace).not.toHaveAttribute('inert', '');
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(sidebar).toBeHidden();
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(page.getByRole('dialog', { name: 'Navegação' })).toHaveCount(0);
  });

  test('marks the current destination and exposes a solid keyboard focus indicator', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin');

    const overview = page.getByRole('link', { name: 'Dashboard geral' });
    await expect(overview).toHaveAttribute('aria-current', 'page');
    await expect(overview).toHaveCSS('background-color', 'rgb(255, 247, 236)');
    await expect(overview).toHaveCSS('color', 'rgb(32, 24, 18)');

    await overview.focus();
    await expect(overview).toHaveCSS('outline-style', 'solid');
    await expect(overview).toHaveCSS('outline-width', '2px');
  });

  test('desktop and mobile authenticated admin references remain stable', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await stabilizeAdminOverview(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await openStableAdminShell(page);
    await expect(page).toHaveScreenshot('platform-shell-desktop.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      scale: 'css',
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await openStableAdminShell(page);
    await expect(page).toHaveScreenshot('platform-shell-mobile.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: true,
      scale: 'css',
    });
  });

  test('reduced motion keeps main content visible and disables drawer movement', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await openStableAdminShell(page);

    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
    const opacityHiddenContent = await mainContent.locator('*').evaluateAll(elements =>
      elements
        .filter(element => {
          const style = getComputedStyle(element);
          return element.getClientRects().length > 0
            && Boolean(element.textContent?.trim())
            && style.display !== 'none'
            && style.visibility !== 'hidden'
            && Number.parseFloat(style.opacity) === 0;
        })
        .map(element => element.tagName.toLowerCase()),
    );
    expect(opacityHiddenContent).toEqual([]);

    await page.getByRole('button', { name: 'Abrir navegação' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navegação' });
    await expect(drawer).toBeVisible();
    const transitionDuration = await drawer.evaluate(element =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
    expect(transitionDuration).toBeLessThanOrEqual(0.00001);
  });

  test('configuration primary save action keeps a 44px touch target', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/configuracoes');

    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
    const saveAction = page.getByRole('button', { name: 'Salvar', exact: true });
    await expect(saveAction).toBeVisible();
    await expect(saveAction).toHaveCSS('min-height', '44px');
    expect((await saveAction.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });
});
