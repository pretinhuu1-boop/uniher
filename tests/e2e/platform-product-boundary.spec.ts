import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const PASSWORD = 'Admin@2026';
const RH_EMAIL = 'rh.visual@eduardaeyurimarketingltda.com.br';
const COLLABORATOR_EMAIL = 'nr1.visual@eduardaeyurimarketingltda.com.br';

type SeedRole = 'admin' | 'rh' | 'colaboradora';

const roleCredentials: Record<SeedRole, { email: string; password: string }> = {
  admin: { email: ADMIN_EMAIL, password: PASSWORD },
  rh: { email: RH_EMAIL, password: PASSWORD },
  colaboradora: { email: COLLABORATOR_EMAIL, password: PASSWORD },
};

const containedRoutes = [
  {
    role: 'admin',
    path: '/concierge',
    title: /Concierge/i,
    anchors: [/Contrato pendente/i, /Permanece bloqueado/i, /Cadastro, atribuicao, triagem/i],
  },
  {
    role: 'admin',
    path: '/canal-denuncias',
    title: /Canal de Den.ncias/i,
    anchors: [/Parceiro pendente/i, /Permanece bloqueado/i, /Formulario, caixa de entrada, protocolo/i],
  },
  {
    role: 'admin',
    path: '/viva-sipat',
    title: /Viva SIPAT/i,
    anchors: [/Fonte de conteudo pendente/i, /Permanece bloqueado/i, /materiais nao fornecidos/i],
  },
  {
    role: 'admin',
    path: '/desenvolvimento-humano',
    title: /Desenvolvimento Humano/i,
    anchors: [/Modulo futuro/i, /Permanece bloqueado/i, /Ranking, pontuacao ou diagnostico/i],
  },
  {
    role: 'rh',
    path: '/nr1',
    title: /NR-1/i,
    anchors: [/Contrato pendente/i, /Permanece bloqueado/i, /Qualquer leitura ou escrita em integracoes Yavix/i],
  },
  {
    role: 'colaboradora',
    path: '/nr1',
    title: /NR-1/i,
    anchors: [/Contrato pendente/i, /Permanece bloqueado/i, /Shell estatico sem chamadas Yavix/i],
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  title: RegExp;
  anchors: readonly RegExp[];
}>;

const reviewRoutes = [
  {
    role: 'rh',
    path: '/liga/gerenciar',
    title: /Gest.o de ligas em revis.o/i,
    anchors: [/Pontuacao e classificacao estao em revisao/i],
  },
  {
    role: 'colaboradora',
    path: '/liga',
    title: /^Liga$/,
    anchors: [/Liga em revisao/i, /nenhuma exposicao nominal/i, /Promocao da pagina sem decisao/i],
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  title: RegExp;
  anchors: readonly RegExp[];
}>;

const safeUsefulRoutes = [
  {
    role: 'rh',
    path: '/produtos-modulos',
    title: /Produtos e M.dulos/i,
    anchors: [/Estados reais do contrato/i, /Modulo sensivel em HOLD/i, /Nao sensiveis editaveis/i, /Auditoria no backend/i],
  },
  {
    role: 'rh',
    path: '/gamificacao-config',
    title: /Conteudos educativos/i,
    anchors: [/Editor ativo de licoes/i, /Pontuacao, ranking, premios e Liga seguem desativados/i],
  },
  {
    role: 'colaboradora',
    path: '/desafios',
    title: /Desafios da empresa/i,
    anchors: [/Convite voluntario, sem ranking/i, /RH nao ve nomes nem progresso individual/i, /Sem Semaforo, NR-1, agenda, exames, pontos ou Liga/i],
  },
  {
    role: 'colaboradora',
    path: '/conquistas',
    title: /Minhas conquistas/i,
    anchors: [/Privadas, deterministicas e sem badge legado/i, /Sem pontos, raridade, ranking ou compartilhamento/i],
  },
  {
    role: 'colaboradora',
    path: '/objetivos',
    title: /Meus objetivos/i,
    anchors: [/sem ranking/i, /Sem pontos, badges, comparacao ou ranking/i],
  },
] as const satisfies ReadonlyArray<{
  role: SeedRole;
  path: string;
  title: RegExp;
  anchors: readonly RegExp[];
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

test.describe('Platform product boundary smoke', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ serviceWorkers: 'block' });

  for (const route of containedRoutes) {
    test(`${route.role} contained surface stays visibly blocked: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/[/?]/g, '\\$&')}$`));
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expectAnchors(page, route.anchors);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  for (const route of reviewRoutes) {
    test(`${route.role} review surface does not reopen legacy gamification: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expectAnchors(page, route.anchors);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  for (const route of safeUsefulRoutes) {
    test(`${route.role} useful surface keeps non-competitive privacy copy: ${route.path}`, async ({ page, context, request, baseURL }) => {
      assertProductBoundaryHostIsLoopback(baseURL);
      await authenticatedPage(page, context, request, baseURL!, route.role);

      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible();
      await expectAnchors(page, route.anchors);
      await expectNoUnsafeControlsOrClaims(page);
    });
  }

  test('RH visual smoke captures Produtos e Modulos desktop and mobile without overflow', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'rh');

    const evidenceDir = path.resolve(__dirname, '..', '..', 'docs', 'superpowers', 'evidence', 'produtos-modulos-ui-local-2026-07-30');
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/produtos-modulos');
    await expect(page.getByRole('heading', { name: /Produtos e M.dulos/i })).toBeVisible();
    await expectAnchors(page, [/Estados reais do contrato/i, /Modulo sensivel em HOLD/i, /Auditoria no backend/i]);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'desktop-1366-produtos-modulos.png'), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/produtos-modulos');
    await expect(page.getByRole('heading', { name: /Produtos e M.dulos/i })).toBeVisible();
    await expectAnchors(page, [/Modulo sensivel em HOLD/i, /Visibilidade nao e permissao/i]);
    await expectNoUnsafeControlsOrClaims(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, 'mobile-390-produtos-modulos.png'), fullPage: true });
  });

  test('collaborator NR-1 runtime route stays blocked or unavailable without production runtime', async ({ page, context, request, baseURL }) => {
    assertProductBoundaryHostIsLoopback(baseURL);
    await authenticatedPage(page, context, request, baseURL!, 'colaboradora');

    await page.goto('/avaliacao-nr1');
    if (new URL(page.url()).pathname === '/nr1') {
      await expect(page.getByRole('heading', { name: 'NR-1', exact: true })).toBeVisible();
      await expectAnchors(page, [/Contrato pendente/i, /Permanece bloqueado/i]);
    } else {
      await expect(page).toHaveURL(/\/avaliacao-nr1$/);
      await expectAnchors(page, [
        /Preview tecnico restrito/i,
        /Nao gera laudo, scoring, conformidade NR-1, GRO\/PGR nem integracao real com a Yavix/i,
        /Runtime Yavix indisponivel/i,
        /permanece bloqueado fora de dev\/test/i,
      ]);
    }
    await expectNoUnsafeControlsOrClaims(page);
  });
});
