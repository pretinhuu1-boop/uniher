import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const PASSWORD = 'Admin@2026';
const RH_EMAIL = 'rh.visual@eduardaeyurimarketingltda.com.br';
const LEADERSHIP_EMAIL = 'lideranca.visual@eduardaeyurimarketingltda.com.br';
const COLLABORATOR_EMAIL = 'nr1.visual@eduardaeyurimarketingltda.com.br';

type SeedRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';

const roleCredentials: Record<SeedRole, { email: string; password: string }> = {
  admin: { email: ADMIN_EMAIL, password: PASSWORD },
  rh: { email: RH_EMAIL, password: PASSWORD },
  lideranca: { email: LEADERSHIP_EMAIL, password: PASSWORD },
  colaboradora: { email: COLLABORATOR_EMAIL, password: PASSWORD },
};

const moduleHoldRedirectRoutes = [
  {
    role: 'admin',
    path: '/concierge',
    expectedUrl: /\/admin\?tab=empresas$/,
    title: /Empresas/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|Cadastro, atribuicao, triagem/i,
  },
  {
    role: 'admin',
    path: '/canal-denuncias',
    expectedUrl: /\/admin\?tab=empresas$/,
    title: /Empresas/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|Formulario, caixa de entrada, protocolo/i,
  },
  {
    role: 'admin',
    path: '/viva-sipat',
    expectedUrl: /\/admin\?tab=empresas$/,
    title: /Empresas/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|materiais nao fornecidos/i,
  },
  {
    role: 'admin',
    path: '/desenvolvimento-humano',
    expectedUrl: /\/admin\?tab=empresas$/,
    title: /Empresas/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|Ranking, pontuacao ou diagnostico/i,
  },
  {
    role: 'rh',
    path: '/nr1',
    expectedUrl: /\/produtos-modulos$/,
    title: /Produtos e M.dulos/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|Qualquer leitura ou escrita em integracoes Yavix|COPSOQ/i,
  },
  {
    role: 'colaboradora',
    path: '/nr1',
    expectedUrl: /\/colaboradora$/,
    title: /Jornada privada/i,
    blockedText: /Como esta pagina vai funcionar|Permanece bloqueado|Shell estatico sem chamadas Yavix|COPSOQ/i,
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  expectedUrl: RegExp;
  title: RegExp;
  blockedText: RegExp;
}>;

const compatibilityRedirectRoutes = [
  {
    role: 'rh',
    path: '/liga/gerenciar',
    expectedUrl: /\/gamificacao-config$/,
    title: /Conteudos educativos/i,
    blockedText: /Gestao de ligas em revisao|Gest.o de ligas em revis.o|Liga em revisao|Liga em revis.o/i,
  },
  {
    role: 'colaboradora',
    path: '/liga',
    expectedUrl: /\/conquistas$/,
    title: /Minhas conquistas/i,
    blockedText: /Liga em revisao|Liga em revis.o|nenhuma exposicao nominal|Promocao da pagina sem decisao/i,
  },
  {
    role: 'lideranca',
    path: '/liga',
    expectedUrl: /\/campanhas$/,
    title: /Campanhas/i,
    blockedText: /Liga em revisao|Liga em revis.o|nenhuma exposicao nominal|Promocao da pagina sem decisao/i,
  },
  {
    role: 'lideranca',
    path: '/liga/gerenciar',
    expectedUrl: /\/campanhas$/,
    title: /Campanhas/i,
    blockedText: /Gestao de ligas em revisao|Gest.o de ligas em revis.o|Liga em revisao|Liga em revis.o/i,
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  expectedUrl: RegExp;
  title: RegExp;
  blockedText: RegExp;
}>;

const safeUsefulRoutes = [
  {
    role: 'rh',
    path: '/produtos-modulos',
    title: /Produtos e M.dulos/i,
    anchors: [/Disponibilidade dos produtos/i, /Produtos protegidos/i, /Produtos configuraveis/i, /Registro das mudancas/i],
    blockedText: /Modulo sensivel em HOLD|Auditoria no backend|\bcompany_modules\b|\bruntime\b|\bscoring\b|\bintake\b|\bHOLD\b/i,
  },
  {
    role: 'rh',
    path: '/gamificacao-config',
    title: /Conteudos educativos/i,
    anchors: [/Editor ativo de licoes/i, /Biblioteca educativa/i, /campos editoriais aprovados/i],
    blockedText: /governanca privada|contrato real|contrato educativo/i,
  },
  {
    role: 'colaboradora',
    path: '/desafios',
    title: /Desafios da empresa/i,
    anchors: [/Participacao voluntaria/i, /Privacidade da participacao/i, /Sua participacao fica no seu espaco privado/i],
  },
  {
    role: 'colaboradora',
    path: '/conquistas',
    title: /Minhas conquistas/i,
    anchors: [/Jornada privada/i, /Privacidade da jornada/i, /Visivel apenas para voce/i],
  },
  {
    role: 'colaboradora',
    path: '/objetivos',
    title: /Meus objetivos/i,
    anchors: [/Jornada privada/i, /Privacidade da jornada/i, /Objetivos pessoais iniciados pela propria colaboradora/i],
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  title: RegExp;
  anchors: readonly RegExp[];
  blockedText?: RegExp;
}>;

const unsafeOperationalControlText = /ativar modulo|habilitar modulo|iniciar avaliacao|aceitar e continuar|emitir laudo|gerar laudo|enviar denuncia|abrir chamado|\bresgatar\b|comprar recompensa/i;
const unsafeLegacyClaims = /desenho aprovado para a proxima etapa|pontos totais|loja de recompensas|recompensas disponiveis|te ultrapassou no ranking|ranking geral|ganhe pontos|ganhar pontos|xp ganho|emitir laudo|gerar laudo|conformidade NR-1 aprovada|GRO\/PGR gerado/i;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLoopbackHostname(hostname: string) {
  const ipv4Octet = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
  const ipv4Loopback = new RegExp(`^127(?:\\.${ipv4Octet}){3}$`);
  return hostname === 'localhost' || hostname === '[::1]' || ipv4Loopback.test(hostname);
}

function assertProductBoundaryHostIsLoopback(baseURL?: string) {
  expect(baseURL, 'platform-product-boundary requires Playwright baseURL').toBeTruthy();
  const hostname = new URL(baseURL!).hostname;
  expect(
    isLoopbackHostname(hostname),
    'platform-product-boundary uses seeded homologation accounts and must not run against non-loopback hosts.',
  ).toBe(true);
}

async function apiLogin(request: APIRequestContext, role: SeedRole): Promise<string> {
  const credentials = roleCredentials[role];
  const response = await request.post('/api/auth/login', {
    data: credentials,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token).toBeTruthy();
  return token;
}

async function authenticatedPage(
  page: Page,
  context: BrowserContext,
  request: APIRequestContext,
  baseURL: string,
  role: SeedRole,
) {
  const token = await apiLogin(request, role);
  await context.clearCookies();
  await context.addCookies([{
    name: 'uniher-access-token',
    value: token,
    url: baseURL,
  }]);
  await page.evaluate(() => sessionStorage.removeItem('uniher-view-mode')).catch(() => undefined);
}

async function expectNoUnsafeControlsOrClaims(page: Page) {
  const unsafeControls = await page.locator('button, a, [role="button"], [role="link"]').evaluateAll((elements) => {
    const normalize = (value: string) => value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    const unsafe = /ativar modulo|habilitar modulo|iniciar avaliacao|aceitar e continuar|emitir laudo|gerar laudo|enviar denuncia|abrir chamado|\bresgatar\b|comprar recompensa/i;

    return elements
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((element) => normalize([
        element.textContent ?? '',
        element.getAttribute('aria-label') ?? '',
        element.getAttribute('title') ?? '',
      ].join(' ')))
      .filter((label) => unsafe.test(label));
  });
  expect(unsafeControls).toEqual([]);
  const bodyText = normalizeText(await page.locator('body').textContent() ?? '');
  expect(bodyText).not.toMatch(unsafeOperationalControlText);
  expect(bodyText).not.toMatch(unsafeLegacyClaims);
}

async function expectAnchors(page: Page, anchors: readonly RegExp[]) {
  const bodyText = normalizeText(await page.locator('body').textContent() ?? '');
  for (const anchor of anchors) {
    expect(bodyText).toMatch(anchor);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflowX).toBe(false);
}

async function expectShellLinksHiddenFromNavigation(page: Page) {
  const navigation = page.locator('nav[aria-label="Navegação principal"]').first();
  for (const href of [
    '/concierge',
    '/nr1',
    '/avaliacao-nr1',
    '/viva-sipat',
    '/desenvolvimento-humano',
    '/canal-denuncias',
  ]) {
    await expect(navigation.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
}

test.describe('Platform product boundary smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ serviceWorkers: 'block' });

  test('unauthenticated Liga compatibility routes preserve original redirect targets', async ({ page, context, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await context.clearCookies();

    await page.goto('/liga', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fliga$/);

    await page.goto('/liga/gerenciar', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auth\?redirect=%2Fliga%2Fgerenciar$/);
  });

  for (const route of moduleHoldRedirectRoutes) {
    test(`${route.role} module HOLD route is hidden behind useful surface: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(route.expectedUrl);
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(route.blockedText);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  for (const route of compatibilityRedirectRoutes) {
    test(`${route.role} Liga compatibility route lands on useful surface: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(route.expectedUrl);
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(route.blockedText);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  for (const route of safeUsefulRoutes) {
    test(`${route.role} useful surface keeps non-competitive privacy copy: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expectAnchors(page, route.anchors);
      if ('blockedText' in route) await expect(page.locator('body')).not.toContainText(route.blockedText);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  test('RH visual smoke captures gamificacao config copy hardening desktop and mobile', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'rh');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'gamificacao-config-copy-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/gamificacao-config', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expectAnchors(page, [/Editor ativo de licoes/i, /Biblioteca educativa/i, /campos editoriais aprovados/i]);
    await expect(page.locator('body')).not.toContainText(/governanca privada|contrato real|contrato educativo/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-gamificacao-config.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/gamificacao-config', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expectAnchors(page, [/Editor ativo de licoes/i, /campos editoriais aprovados/i]);
    await expect(page.locator('body')).not.toContainText(/governanca privada|contrato real|contrato educativo/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-gamificacao-config.png'), fullPage: true });
  });

  test('RH visual smoke captures Produtos e Modulos desktop and mobile without overflow', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'rh');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'produtos-modulos-ui-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/produtos-modulos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Produtos e M.dulos/i })).toBeVisible();
    await expectAnchors(page, [/Disponibilidade dos produtos/i, /Produtos protegidos/i, /Registro das mudancas/i]);
    await expect(page.locator('body')).not.toContainText(/Modulo sensivel em HOLD|Auditoria no backend|\bcompany_modules\b|\bruntime\b|\bscoring\b|\bintake\b|\bHOLD\b/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-produtos-modulos.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/produtos-modulos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Produtos e M.dulos/i })).toBeVisible();
    await expectAnchors(page, [/Produtos protegidos/i, /Menu nao libera operacao/i]);
    await expect(page.locator('body')).not.toContainText(/Modulo sensivel em HOLD|Auditoria no backend|\bcompany_modules\b|\bruntime\b|\bscoring\b|\bintake\b|\bHOLD\b/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-produtos-modulos.png'), fullPage: true });
  });

  test('RH compatibility redirects hide legacy spec routes behind useful surfaces', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'rh');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'compat-redirects-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/historico', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\?section=exames$/);
    await expect(page.getByText('Atividade de exames')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Historico indisponivel|Histórico indisponível/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-historico-redirect-dashboard-exames.png'), fullPage: true });

    await page.goto('/desafios/gerenciar', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/gamificacao-config$/);
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Gestao de desafios em revisao|Gestão de desafios em revisão/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-desafios-gerenciar-redirect-gamificacao-config.png'), fullPage: true });

    await page.goto('/liga/gerenciar', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/gamificacao-config$/);
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Gestao de ligas em revisao|Gest.o de ligas em revis.o|Liga em revisao|Liga em revis.o/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-liga-gerenciar-redirect-gamificacao-config.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/historico', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\?section=exames$/);
    await expect(page.getByText('Atividade de exames')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Historico indisponivel|Histórico indisponível/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-historico-redirect-dashboard-exames.png'), fullPage: true });

    await page.goto('/desafios/gerenciar', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/gamificacao-config$/);
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Gestao de desafios em revisao|Gestão de desafios em revisão/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-desafios-gerenciar-redirect-gamificacao-config.png'), fullPage: true });

    await page.goto('/liga/gerenciar', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/gamificacao-config$/);
    await expect(page.getByRole('heading', { name: /Conteudos educativos/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Gestao de ligas em revisao|Gest.o de ligas em revis.o|Liga em revisao|Liga em revis.o/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-liga-gerenciar-redirect-gamificacao-config.png'), fullPage: true });
  });

  test('collaborator Liga compatibility route lands on private achievements', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'colaboradora');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'compat-redirects-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/liga', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/conquistas$/);
    await expect(page.getByRole('heading', { name: /Minhas conquistas/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Liga em revisao|Liga em revis.o|nenhuma exposicao nominal|Promocao da pagina sem decisao/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-liga-redirect-conquistas.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/liga', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/conquistas$/);
    await expect(page.getByRole('heading', { name: /Minhas conquistas/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Liga em revisao|Liga em revis.o|nenhuma exposicao nominal|Promocao da pagina sem decisao/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-liga-redirect-conquistas.png'), fullPage: true });
  });

  test('collaborator home replaces legacy gamification review with private journey links', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'colaboradora');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'collaborator-home-private-journey-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/colaboradora', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Jornada privada/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir objetivos/i })).toHaveAttribute('href', '/objetivos');
    await expect(page.getByRole('link', { name: /Abrir desafios/i })).toHaveAttribute('href', '/desafios');
    await expect(page.getByRole('link', { name: /Abrir conquistas/i })).toHaveAttribute('href', '/conquistas');
    await expect(page.locator('body')).not.toContainText(/Pontuacao e classificacao em revisao|Pontua.o e classifica.o em revis.o/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-colaboradora-private-journey.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/colaboradora', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Jornada privada/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir objetivos/i })).toHaveAttribute('href', '/objetivos');
    await expect(page.getByRole('link', { name: /Abrir desafios/i })).toHaveAttribute('href', '/desafios');
    await expect(page.getByRole('link', { name: /Abrir conquistas/i })).toHaveAttribute('href', '/conquistas');
    await expect(page.locator('body')).not.toContainText(/Pontuacao e classificacao em revisao|Pontua.o e classifica.o em revis.o/i);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-colaboradora-private-journey.png'), fullPage: true });
  });

  test('authenticated navigation hides module shells without approved contracts', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'shell-navigation-hidden-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await authenticatedPage(page, context, request, baseURL!, 'admin');
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: /Navega/i })).toBeVisible();
    await expectShellLinksHiddenFromNavigation(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-admin-sidebar-shell-links-hidden.png'), fullPage: true });

    await authenticatedPage(page, context, request, baseURL!, 'rh');
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Atividade de exames')).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Navega/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /Navega/i })).not.toContainText('Concierge');
    await expectShellLinksHiddenFromNavigation(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-rh-sidebar-shell-links-hidden.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Atividade de exames')).toBeVisible();
    await page.getByRole('button', { name: /Abrir navega/i }).click();
    await expect(page.getByRole('dialog', { name: /Navega/i })).toBeVisible();
    await expectShellLinksHiddenFromNavigation(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-rh-sidebar-shell-links-hidden.png'), fullPage: true });
  });

  test('collaborator NR-1 runtime route hides technical preview without production runtime', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'colaboradora');

    await page.goto('/avaliacao-nr1', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/colaboradora$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Jornada privada/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Preview tecnico restrito|Preview t.cnico restrito|Previa indisponivel|Runtime Yavix indisponivel|permanece bloqueado fora de dev\/test/i);
    await expect(page.locator('body')).not.toContainText(/Contrato pendente|Permanece bloqueado|Shell estatico sem chamadas Yavix|COPSOQ/i);
    await expectNoUnsafeControlsOrClaims(page);
  });
});
