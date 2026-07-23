import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_ICONS,
  USER_ROLES,
  getModuleAwareNavigationForRole,
  getNavigationForRole,
  getRoleHome,
  isNavigationItemActive,
  isUserRole,
  normalizeUserRole,
  resolveActiveView,
} from '@/components/platform/navigation';
import type { NavigationGroup, NavigationIcon } from '@/components/platform/navigation';
import type { UserRole } from '@/types/platform';
import type { CompanyModuleRecord } from '@/types/modules';

const EXPECTED_NAVIGATION = {
  admin: [
    {
      label: 'Dashboard geral',
      items: [
        {
          href: '/admin',
          label: 'Dashboard geral',
          icon: 'companies',
          description: 'Empresas, usuarios e integridade operacional da plataforma',
        },
      ],
    },
    {
      label: 'Empresas',
      items: [
        {
          href: '/admin?tab=empresas',
          label: 'Empresas',
          icon: 'companies',
          description: 'Lista, ambientes, usuarios, permissoes e configuracoes de empresas',
        },
      ],
    },
    {
      label: 'Saude Primaria',
      items: [
        {
          href: '/saude-primaria',
          label: 'Saude Primaria',
          icon: 'semaforo',
          description: 'Visao agregada futura do Semaforo, bloqueada por governanca clinica',
        },
        {
          href: '/concierge',
          label: 'Concierge',
          icon: 'profile',
          description: 'Gestao de casos somente quando o modulo e contrato estiverem aprovados',
        },
        {
          href: '/historico',
          label: 'Dashboard de exames',
          icon: 'historico',
          description: 'Base existente para relatorios e acompanhamento de exames',
        },
      ],
    },
    {
      label: 'Educacao',
      items: [
        {
          href: '/comunidade/gerenciar',
          label: 'Educacao',
          icon: 'community',
          description: 'Conteudos editoriais e campanhas educativas das empresas',
        },
      ],
    },
    {
      label: 'Gamificacao',
      items: [
        {
          href: '/gamificacao-config',
          label: 'Gamificacao',
          icon: 'config',
          description: 'Governanca de desafios, recompensas e rankings aprovados',
        },
      ],
    },
    {
      label: 'Produtos e Modulos',
      items: [
        {
          href: '/produtos-modulos',
          label: 'Produtos e Modulos',
          icon: 'config',
          description: 'Controle administrativo em preparacao para modulos contratados',
        },
      ],
    },
    {
      label: 'Relatorios',
      items: [
        {
          href: '/analytics-emails',
          label: 'Relatorios',
          icon: 'analytics',
          description: 'Comunicacao e atividade agregada da plataforma',
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          href: '/admin?tab=sistema',
          label: 'Sistema',
          icon: 'config',
          description: 'Administradores UniHER, permissoes e configuracoes globais no painel master',
        },
      ],
    },
  ],
  rh: [
    {
      label: 'Dashboard',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          description: 'Visao geral, atencao, acoes e impacto da empresa',
        },
      ],
    },
    {
      label: 'Pessoas',
      items: [
        {
          href: '/colaboradoras-gestao',
          label: 'Colaboradoras',
          icon: 'colaboradoras',
          description: 'Aprovacoes, perfis e status',
        },
        {
          href: '/departamentos',
          label: 'Departamentos',
          icon: 'departamentos',
          description: 'Estrutura e participacao por setor',
        },
        {
          href: '/convites',
          label: 'Convites',
          icon: 'invite',
          description: 'Entrada de novas colaboradoras',
        },
      ],
    },
    {
      label: 'Educacao',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas e trilhas',
          icon: 'campanhas',
          description: 'Planejar campanhas, trilhas e conteudos educativos',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Conteudos educativos',
          icon: 'community',
          description: 'Publicar e organizar conteudos da comunidade',
        },
      ],
    },
    {
      label: 'Conquistas',
      items: [
        {
          href: '/desafios/gerenciar',
          label: 'Desafios',
          icon: 'desafios',
          description: 'Configurar desafios aprovados para a empresa',
        },
        {
          href: '/gamificacao-config',
          label: 'Configuracao de conquistas',
          icon: 'config',
          description: 'Governar objetivos, desafios e gamificacao aprovada',
        },
      ],
    },
    {
      label: 'Gestao',
      items: [
        {
          href: '/historico',
          label: 'Historico',
          icon: 'historico',
          description: 'Relatorios e evolucao',
        },
        {
          href: '/analytics-emails',
          label: 'Comunicacao',
          icon: 'analytics',
          description: 'Entrega e leitura de mensagens',
        },
        {
          href: '/company-profile',
          label: 'Perfil da empresa',
          icon: 'profile',
          description: 'Dados e identidade corporativa',
        },
      ],
    },
  ],
  lideranca: [
    {
      label: 'Dashboard',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard da equipe',
          icon: 'dashboard',
          description: 'Resumo da equipe',
        },
      ],
    },
    {
      label: 'Educacao',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas e trilhas',
          icon: 'campanhas',
          description: 'Campanhas e conteudos disponiveis',
        },
      ],
    },
  ],
  colaboradora: [
    {
      label: 'Meu bem-estar',
      items: [
        {
          href: '/colaboradora',
          label: 'Hoje',
          icon: 'dashboard',
          description: 'Check-in, foco do dia e proximas acoes',
        },
        {
          href: '/agenda',
          label: 'Minha agenda de exames',
          icon: 'agenda',
          description: 'Exames, consultas, lembretes e historico',
        },
      ],
    },
    {
      label: 'Saude Primaria',
      items: [
        {
          href: '/semaforo',
          label: 'Meu semaforo',
          icon: 'semaforo',
          description: 'Leitura individual de cuidado em superficie contida',
        },
      ],
    },
    {
      label: 'Educacao',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas e trilhas',
          icon: 'campanhas',
          description: 'Conteudos, trilhas e acoes educativas disponiveis',
        },
        {
          href: '/comunidade',
          label: 'Comunidade',
          icon: 'community',
          description: 'Conteudos editoriais da sua empresa',
        },
      ],
    },
    {
      label: 'Conquistas',
      items: [
        {
          href: '/objetivos',
          label: 'Objetivos',
          icon: 'objetivos',
          description: 'Metas pessoais de bem-estar',
        },
        {
          href: '/desafios',
          label: 'Desafios',
          icon: 'desafios',
          description: 'Atividades em andamento',
        },
        {
          href: '/conquistas',
          label: 'Conquistas',
          icon: 'conquistas',
          description: 'Marcos da sua jornada',
        },
      ],
    },
  ],
} as const satisfies Record<UserRole, readonly NavigationGroup[]>;

const ADMIN_DENIED_ROUTES = [
  '/dashboard',
  '/colaboradora',
  '/colaboradoras-gestao',
  '/departamentos',
  '/semaforo',
  '/campanhas',
  '/objetivos',
  '/desafios',
  '/desafios/gerenciar',
  '/conquistas',
  '/liga',
  '/liga/gerenciar',
  '/agenda',
  '/company-profile',
  '/convites',
  '/comunidade',
] as const;

function moduleRow(
  module_slug: CompanyModuleRecord['module_slug'],
  module_state: CompanyModuleRecord['module_state'],
  visible: 0 | 1 = 1,
): Pick<CompanyModuleRecord, 'module_slug' | 'module_state' | 'visible'> {
  return { module_slug, module_state, visible };
}

function flatItems(groups: readonly NavigationGroup[]) {
  return groups.flatMap((group) => group.items);
}

describe('platform navigation', () => {
  it('keeps the exhaustive role registry aligned with the navigation table', () => {
    expect(USER_ROLES).toEqual(Object.keys(EXPECTED_NAVIGATION));
  });

  it.each(USER_ROLES)('returns the exact navigation table for %s', (role) => {
    expect(getNavigationForRole(role)).toEqual(EXPECTED_NAVIGATION[role]);
  });

  it('regroups existing Paola surfaces without adding base navigation routes', () => {
    const routesFor = (role: UserRole) => getNavigationForRole(role)
      .flatMap((group) => group.items.map((item) => item.href));
    const groupLabelsFor = (role: UserRole) => getNavigationForRole(role)
      .map((group) => group.label);

    expect(routesFor('rh')).toEqual([
      '/dashboard',
      '/colaboradoras-gestao',
      '/departamentos',
      '/convites',
      '/campanhas',
      '/comunidade/gerenciar',
      '/desafios/gerenciar',
      '/gamificacao-config',
      '/historico',
      '/analytics-emails',
      '/company-profile',
    ]);
    expect(groupLabelsFor('rh')).toEqual(['Dashboard', 'Pessoas', 'Educacao', 'Conquistas', 'Gestao']);

    expect(routesFor('colaboradora')).toEqual([
      '/colaboradora',
      '/agenda',
      '/semaforo',
      '/campanhas',
      '/comunidade',
      '/objetivos',
      '/desafios',
      '/conquistas',
    ]);
    expect(groupLabelsFor('colaboradora')).toEqual(['Meu bem-estar', 'Saude Primaria', 'Educacao', 'Conquistas']);
  });

  it('covers the Admin Master taxonomy requested by Paola with safe existing destinations', () => {
    const groups = getNavigationForRole('admin');
    const labels = groups.map((group) => group.label);
    const routes = flatItems(groups).map((item) => item.href);

    expect(labels).toEqual([
      'Dashboard geral',
      'Empresas',
      'Saude Primaria',
      'Educacao',
      'Gamificacao',
      'Produtos e Modulos',
      'Relatorios',
      'Sistema',
    ]);
    expect(routes).toEqual([
      '/admin',
      '/admin?tab=empresas',
      '/saude-primaria',
      '/concierge',
      '/historico',
      '/comunidade/gerenciar',
      '/gamificacao-config',
      '/produtos-modulos',
      '/analytics-emails',
      '/admin?tab=sistema',
    ]);
  });

  it('keeps module-aware navigation identical when no company module rows exist', () => {
    expect(getModuleAwareNavigationForRole('colaboradora', [])).toEqual(getNavigationForRole('colaboradora'));
  });

  it('adds visible module rows with honest state badges without duplicating existing routes', () => {
    const items = flatItems(getModuleAwareNavigationForRole('colaboradora', [
      moduleRow('education', 'enabled'),
      moduleRow('achievements', 'enabled'),
      moduleRow('primary_health', 'locked'),
      moduleRow('nr1', 'requires_contract'),
      moduleRow('sipat', 'locked'),
      moduleRow('human_development', 'requires_contract'),
      moduleRow('denunciation', 'partner_managed'),
      moduleRow('concierge', 'requires_contract'),
    ]));
    const routes = items.map((item) => item.href);
    const byLabel = Object.fromEntries(items.map((item) => [item.label, item]));

    expect(new Set(routes).size).toBe(routes.length);
    expect(routes).toContain('/saude-primaria');
    expect(routes).toContain('/avaliacao-nr1');
    expect(routes).toContain('/viva-sipat');
    expect(routes).toContain('/desenvolvimento-humano');
    expect(routes).toContain('/canal-denuncias');
    expect(routes).not.toContain('/concierge');
    expect(routes.filter((route) => route === '/campanhas')).toHaveLength(1);
    expect(routes.filter((route) => route === '/conquistas')).toHaveLength(1);
    expect(byLabel['Saude Primaria'].badgeLabel).toBe('Bloqueado');
    expect(byLabel['NR-1'].badgeLabel).toBe('Contrato');
    expect(byLabel['Canal de Denuncias'].badgeLabel).toBe('Parceiro');
  });

  it('keeps role visibility separate from module access state', () => {
    const rows = [
      moduleRow('concierge', 'enabled'),
      moduleRow('nr1', 'enabled'),
      moduleRow('sipat', 'enabled', 0),
    ];
    const leadershipRoutes = flatItems(getModuleAwareNavigationForRole('lideranca', rows))
      .map((item) => item.href);
    const rhRoutes = flatItems(getModuleAwareNavigationForRole('rh', rows))
      .map((item) => item.href);

    expect(leadershipRoutes).not.toContain('/concierge');
    expect(leadershipRoutes).not.toContain('/avaliacao-nr1');
    expect(leadershipRoutes).not.toContain('/viva-sipat');
    expect(rhRoutes).toContain('/concierge');
    expect(rhRoutes).toContain('/avaliacao-nr1');
    expect(rhRoutes).not.toContain('/viva-sipat');
  });

  it('keeps admin navigation free from non-admin destinations', () => {
    const adminRoutes = getNavigationForRole('admin').flatMap((group) => group.items.map((item) => item.href));
    expect(adminRoutes.filter((route) => ADMIN_DENIED_ROUTES.includes(route as typeof ADMIN_DENIED_ROUTES[number]))).toEqual([]);
  });

  it('applies the community role boundary to every navigation table', () => {
    const routesFor = (role: UserRole) => getNavigationForRole(role)
      .flatMap((group) => group.items.map((item) => item.href));

    expect(routesFor('colaboradora')).toContain('/comunidade');
    expect(routesFor('colaboradora')).not.toContain('/comunidade/gerenciar');
    expect(routesFor('rh')).toContain('/comunidade/gerenciar');
    expect(routesFor('rh')).not.toContain('/comunidade');
    expect(routesFor('admin')).toContain('/comunidade/gerenciar');
    expect(routesFor('admin')).not.toContain('/comunidade');
    expect(routesFor('lideranca')).not.toContain('/comunidade');
    expect(routesFor('lideranca')).not.toContain('/comunidade/gerenciar');
  });

  it.each(['rh', 'lideranca'] as const)('keeps %s navigation free from personal Agenda', (role) => {
    const routes = getNavigationForRole(role).flatMap((group) => group.items.map((item) => item.href));
    expect(routes).not.toContain('/agenda');
  });

  it('keeps unapproved personal and competitive surfaces out of management navigation', () => {
    const routesFor = (role: UserRole) => getNavigationForRole(role)
      .flatMap((group) => group.items.map((item) => item.href));

    expect(routesFor('rh')).not.toContain('/semaforo');
    expect(routesFor('rh')).not.toContain('/objetivos');
    expect(routesFor('rh')).not.toContain('/liga/gerenciar');
    expect(routesFor('lideranca')).not.toContain('/semaforo');
    expect(routesFor('colaboradora')).not.toContain('/liga');
  });

  it('uses only registered, unique navigation icons', () => {
    const registeredIcons = new Set<NavigationIcon>(NAVIGATION_ICONS);
    const usedIcons = USER_ROLES.flatMap((role) =>
      getNavigationForRole(role).flatMap((group) => group.items.map((item) => item.icon)),
    );

    expect(new Set(NAVIGATION_ICONS).size).toBe(NAVIGATION_ICONS.length);
    expect(usedIcons.every((icon) => registeredIcons.has(icon))).toBe(true);
  });

  it.each(USER_ROLES)('does not define duplicate routes for %s', (role) => {
    const routes = getNavigationForRole(role).flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('recognizes and normalizes runtime role values', () => {
    expect(USER_ROLES.every((role) => isUserRole(role))).toBe(true);
    expect(isUserRole('unexpected')).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(normalizeUserRole('rh')).toBe('rh');
    expect(normalizeUserRole('unexpected')).toBe('colaboradora');
    expect(normalizeUserRole(undefined)).toBe('colaboradora');
  });

  it('resolves a persisted view only when switching is allowed and the view is valid', () => {
    expect(resolveActiveView('rh', true, 'colaboradora')).toBe('colaboradora');
    expect(resolveActiveView('rh', true, 'rh')).toBe('rh');
    expect(resolveActiveView('rh', true, 'admin')).toBe('rh');
    expect(resolveActiveView('rh', false, 'colaboradora')).toBe('rh');
    expect(resolveActiveView('rh', true, 'unexpected')).toBe('rh');
    expect(resolveActiveView('unexpected', true, 'unexpected')).toBe('colaboradora');
  });

  it('returns a safe home for every profile and unexpected runtime roles', () => {
    expect(getRoleHome('admin')).toBe('/admin');
    expect(getRoleHome('rh')).toBe('/dashboard');
    expect(getRoleHome('lideranca')).toBe('/dashboard');
    expect(getRoleHome('colaboradora')).toBe('/colaboradora');
    expect(getRoleHome('unexpected' as UserRole)).toBe('/colaboradora');
  });

  it('matches active routes only on path segment boundaries', () => {
    expect(isNavigationItemActive('/desafios', '/desafios')).toBe(true);
    expect(isNavigationItemActive('/desafios/123', '/desafios')).toBe(true);
    expect(isNavigationItemActive('/desafios?filter=ativas', '/desafios')).toBe(true);
    expect(isNavigationItemActive('/desafios-gerenciar', '/desafios')).toBe(false);
    expect(isNavigationItemActive('/administer', '/admin')).toBe(false);
    expect(isNavigationItemActive('/', '/')).toBe(true);
    expect(isNavigationItemActive('/dashboard', '/')).toBe(false);
  });

  it('matches Admin tab shortcuts by query string without marking the base dashboard active', () => {
    expect(isNavigationItemActive('/admin?tab=empresas', '/admin?tab=empresas')).toBe(true);
    expect(isNavigationItemActive('/admin?tab=sistema', '/admin?tab=empresas')).toBe(false);
    expect(isNavigationItemActive('/admin?tab=empresas', '/admin')).toBe(false);
    expect(isNavigationItemActive('/admin', '/admin?tab=empresas')).toBe(false);
  });
});
