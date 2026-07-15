import { expect, test, type APIRequestContext, type BrowserContext } from '@playwright/test';
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

    const overview = page.getByRole('link', { name: 'Visão geral' });
    await expect(overview).toHaveAttribute('aria-current', 'page');
    await expect(overview).toHaveCSS('background-color', 'rgb(255, 247, 236)');
    await expect(overview).toHaveCSS('color', 'rgb(32, 24, 18)');

    await overview.focus();
    await expect(overview).toHaveCSS('outline-style', 'solid');
    await expect(overview).toHaveCSS('outline-width', '2px');
  });
});
