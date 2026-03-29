/**
 * visual-ux.spec.ts — Teste visual E2E completo
 * Simula usuário real: abre browser, clica, preenche, verifica.
 * Cobre: Master Admin → Admin Empresa → Colaboradora
 *
 * Rodar: npx playwright test --project=visual-ux
 */
import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASS = 'Admin@2026';

// Helper: login via UI
async function loginUI(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth`);
  await page.waitForLoadState('networkidle');
  // Clear autofill and type
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(admin|dashboard|primeiro-acesso|colaboradora|welcome)/, { timeout: 10000 });
}

// Helper: logout via UI
async function logoutUI(page: Page) {
  // Try sidebar logout button
  const logoutBtn = page.locator('button:has-text("Sair da Conta"), button:has-text("Sair da conta")').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL('**/', { timeout: 5000 });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MASTER ADMIN
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Master Admin — Visual UX', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  const ts = Date.now().toString().slice(-6);
  const newCompanyName = `Empresa Teste ${ts}`;
  const newCompanyCnpj = `11.222.333/0001-${ts.slice(0, 2)}`;
  const newAdminEmail = `admin-visual-${ts}@empresa.com`;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginUI(page, ADMIN_EMAIL, ADMIN_PASS);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Painel Master — Visão Geral carrega', async () => {
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(5000);
    // Page loaded — check for any content
    await expect(page.locator('text=Painel UniHER')).toBeVisible({ timeout: 15000 });
  });

  test('Tab Empresas — lista carrega', async () => {
    await page.locator('text=Empresas').first().click();
    await expect(page.locator('text=Empresas Cadastradas')).toBeVisible();
    await expect(page.locator('text=+ Nova Empresa')).toBeVisible();
  });

  test('Criar empresa via API e verificar na lista', async () => {
    // Create via API (more reliable than filling form)
    const res = await page.request.post(`${BASE}/api/admin/companies`, {
      data: { name: newCompanyName, cnpj: newCompanyCnpj, sector: 'Visual Test', plan: 'trial' },
    });
    expect(res.status()).toBe(200);
    // Reload and verify in list
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(3000);
    await page.locator('text=Empresas').first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator(`text=${newCompanyName}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('Tab Usuários — lista carrega', async () => {
    await page.locator('button:has-text("Usuários"), [role="tab"]:has-text("Usuários")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=+ Novo Usuário')).toBeVisible();
  });

  test('Formulário Novo Usuário abre', async () => {
    await page.locator('text=+ Novo Usuário').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Novo Usuário').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Tab Admin Master — lista visível', async () => {
    await page.locator('button:has-text("Admin Master"), [role="tab"]:has-text("Admin Master")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Admins Master')).toBeVisible();
    await expect(page.locator('text=admin@uniher.com.br')).toBeVisible();
  });

  test('Tab Sistema — identidade visual', async () => {
    await page.locator('button:has-text("Sistema"), [role="tab"]:has-text("Sistema")').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Identidade Visual')).toBeVisible();
  });

  test('Sidebar — Notificações e Configurações acessíveis', async () => {
    await page.locator('text=Notificações').first().click();
    await page.waitForURL('**/notificacoes');
    await expect(page.locator('h1:has-text("Notificações"), h2:has-text("Notificações")')).toBeVisible();
    await page.goBack();
  });

  test('Logout funciona', async () => {
    await logoutUI(page);
    await expect(page).toHaveURL(/\/(auth)?$/);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ADMIN EMPRESA (RH)
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Admin Empresa — Visual UX', () => {
  test.describe.configure({ mode: 'serial' });

  let page: Page;
  const RH_EMAIL = 'contabilidade@eduardaeyurimarketingltda.com.br';

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginUI(page, RH_EMAIL, ADMIN_PASS);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('Dashboard carrega sem badge debug', async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    // No OFG badge
    await expect(page.locator('text=OFG')).not.toBeVisible();
    // KPIs visible
    await expect(page.locator('text=Colaboradoras Ativas')).toBeVisible();
  });

  test('Colaboradoras — gestão carrega', async () => {
    await page.goto(`${BASE}/colaboradoras-gestao`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Gestão de Colaboradoras')).toBeVisible();
    await expect(page.locator('text=TOTAL')).toBeVisible();
  });

  test('Departamentos — página carrega', async () => {
    await page.goto(`${BASE}/departamentos`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Departamentos').first()).toBeVisible({ timeout: 10000 });
  });

  test('Convites — página carrega', async () => {
    await page.goto(`${BASE}/convites`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Convites').first()).toBeVisible({ timeout: 10000 });
  });

  test('Campanhas — lista carrega', async () => {
    await page.goto(`${BASE}/campanhas`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Campanhas Temáticas')).toBeVisible();
    await expect(page.locator('text=+ Criar Campanha')).toBeVisible();
  });

  test('Semáforo de Saúde carrega', async () => {
    await page.goto(`${BASE}/semaforo`);
    await page.waitForTimeout(3000);
    await expect(page.locator('text=Semáforo').first()).toBeVisible({ timeout: 10000 });
  });

  test('Troca para Colaboradora funciona', async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    const colabBtn = page.locator('button:has-text("Colaboradora")').first();
    if (await colabBtn.isVisible({ timeout: 5000 })) {
      await colabBtn.click();
      await page.waitForTimeout(4000);
      // Should see collaborator menu items or collaborator page
      const hasMeuPainel = await page.locator('text=Meu Painel').isVisible().catch(() => false);
      const hasMeuSemaforo = await page.locator('text=Meu Semáforo').isVisible().catch(() => false);
      expect(hasMeuPainel || hasMeuSemaforo).toBeTruthy();
    }
  });

  test('Volta para RH funciona', async () => {
    const rhBtn = page.locator('button:has-text("RH")').first();
    if (await rhBtn.isVisible()) {
      await rhBtn.click();
      await page.waitForTimeout(3000);
      await expect(page.locator('text=Dashboard').first()).toBeVisible();
    }
  });

  test('Configurações carrega', async () => {
    await page.goto(`${BASE}/configuracoes`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Configurações"), h2:has-text("Configurações")')).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// MOBILE
// ════════════════════════════════════════════════════════════════════════════════

test.describe('Mobile — Visual UX', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('Login page responsive', async ({ page }) => {
    await page.goto(`${BASE}/auth`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Logo visible
    await expect(page.locator('img[alt*="UniHER"]').or(page.locator('text=UniHER'))).toBeVisible();
  });

  test('Dashboard mobile — sidebar accessible', async ({ page }) => {
    await loginUI(page, 'contabilidade@eduardaeyurimarketingltda.com.br', ADMIN_PASS);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3000);
    // On mobile, content should be visible
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  });

  test('Buttons stack correctly on mobile', async ({ page }) => {
    await loginUI(page, 'contabilidade@eduardaeyurimarketingltda.com.br', ADMIN_PASS);
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');
    // EXPORTAR and CONVIDAR buttons should be visible (stacked)
    await expect(page.locator('text=EXPORTAR')).toBeVisible();
    await expect(page.locator('text=CONVIDAR')).toBeVisible();
  });
});
