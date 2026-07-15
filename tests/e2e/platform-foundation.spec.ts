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

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(navigation).toBeVisible();
    await expect(navigation).toHaveCSS('background-color', 'rgb(32, 24, 18)');
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
  });

  test('opens an accessible mobile drawer without overflow and restores focus on Escape', async ({ page, request, context, baseURL }) => {
    await authenticateAdmin(request, context, baseURL!);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');

    const menuButton = page.getByRole('button', { name: 'Abrir navegação' });
    await menuButton.click();

    const drawer = page.getByRole('dialog', { name: 'Navegação' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link').first()).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
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
