import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.UNIHER_E2E_BASE_URL!;
const COLLABORATOR_EMAIL = process.env.UNIHER_E2E_COLLABORATOR_EMAIL!;
const COLLABORATOR_PASSWORD = process.env.UNIHER_E2E_COLLABORATOR_PASSWORD!;
const ARTIFACT_DIR = process.env.UNIHER_E2E_ARTIFACT_DIR || 'artifacts/semaforo-retirement';

async function ensureExamList(page: Page) {
  const birthDateInput = page.getByLabel('Data de nascimento');
  if (await birthDateInput.isVisible()) {
    await birthDateInput.fill('1985-07-31');
  }
  await expect(page.locator('fieldset')).toHaveCount(13);
}

test('keeps only the preventive exam Semaforo on desktop and mobile', async ({ page }) => {
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(COLLABORATOR_EMAIL);
  await page.locator('input[type="password"]').fill(COLLABORATOR_PASSWORD);
  await expect(page.locator('input[type="email"]')).toHaveValue(COLLABORATOR_EMAIL);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(colaboradora|welcome|primeiro-acesso)/, { timeout: 15_000 });

  const unexpectedMutations: string[] = [];
  await page.route(`${BASE_URL}/api/**`, async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {
      unexpectedMutations.push(`${request.method()} ${request.url()}`);
      await route.abort();
      return;
    }
    await route.continue();
  });

  const initialLoad = page.waitForResponse(
    (response) => response.url().endsWith('/api/collaborator/health-checkin'),
  );
  await page.goto(`${BASE_URL}/semaforo`);
  expect((await initialLoad).status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Semaforo da Saude/i })).toBeVisible();
  await expect(page.getByText('Saude primaria', { exact: true })).toBeVisible();
  await expect(page.getByText('Meu Semaforo', { exact: true })).toBeVisible();
  await ensureExamList(page);

  const pageText = await page.locator('main').innerText();
  const visibleLines = new Set(pageText.split('\n').map((line) => line.trim().toLocaleLowerCase('pt-BR')));
  for (const retiredDimension of ['engajamento', 'habitos', 'sono', 'energia', 'saude mental']) {
    expect(visibleLines.has(retiredDimension), retiredDimension).toBe(false);
  }

  const currentApi = await page.request.get(`${BASE_URL}/api/collaborator/health-checkin`);
  expect(currentApi.status()).toBe(200);

  for (const legacyPath of [
    '/api/collaborator/semaforo',
    '/api/collaborator/semaforo/history',
    '/api/collaborator/semaforo/recalculate',
  ]) {
    const response = await page.request.get(`${BASE_URL}${legacyPath}`);
    expect(response.status(), legacyPath).toBe(404);
  }

  const screenshotDir = path.resolve(process.cwd(), ARTIFACT_DIR);
  mkdirSync(screenshotDir, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshotDir, 'semaforo-desktop.png'),
  });

  const submitButton = page.getByRole('button', { name: 'Ver meu resultado' });
  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'semaforo-desktop-bottom.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLoad = page.waitForResponse(
    (response) => response.url().endsWith('/api/collaborator/health-checkin'),
  );
  await page.reload();
  expect((await mobileLoad).status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Semaforo da Saude/i })).toBeVisible();
  await ensureExamList(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(screenshotDir, 'semaforo-mobile.png'),
  });
  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, 'semaforo-mobile-bottom.png') });
  expect(unexpectedMutations).toEqual([]);
});
