import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_ICONS,
  USER_ROLES,
  getNavigationForRole,
  getRoleHome,
  isNavigationItemActive,
  isUserRole,
  normalizeUserRole,
  resolveActiveView,
} from '@/components/platform/navigation';
import type { NavigationGroup, NavigationIcon } from '@/components/platform/navigation';
import type { UserRole } from '@/types/platform';

const EXPECTED_NAVIGATION = {
  admin: [
    {
      label: 'Operação',
      items: [
        {
          href: '/admin',
          label: 'Visão geral',
          icon: 'companies',
          description: 'Exceções, empresas e integridade da plataforma',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Gerenciar comunidade',
          icon: 'community',
          description: 'Conteúdos editoriais das comunidades das empresas',
        },
        {
          href: '/analytics-emails',
          label: 'Analytics global',
          icon: 'analytics',
          description: 'Comunicação e atividade agregada',
        },
      ],
    },
  ],
  rh: [
    {
      label: 'Visão geral',
      items: [
        {
          href: '/dashboard',
          label: 'Início',
          icon: 'dashboard',
          description: 'Atenção, ações e impacto',
        },
        {
          href: '/semaforo',
          label: 'Semáforo de saúde',
          icon: 'semaforo',
          description: 'Indicadores agregados de atenção',
        },
      ],
    },
    {
      label: 'Pessoas e cuidado',
      items: [
        {
          href: '/colaboradoras-gestao',
          label: 'Colaboradoras',
          icon: 'colaboradoras',
          description: 'Aprovações, perfis e status',
        },
        {
          href: '/departamentos',
          label: 'Departamentos',
          icon: 'departamentos',
          description: 'Estrutura e participação por setor',
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
      label: 'Engajamento',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas',
          icon: 'campanhas',
          description: 'Planejar e acompanhar campanhas',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Gerenciar comunidade',
          icon: 'community',
          description: 'Publicar e organizar conteúdos da comunidade',
        },
        {
          href: '/objetivos',
          label: 'Objetivos',
          icon: 'objetivos',
          description: 'Metas e recompensas',
        },
        {
          href: '/desafios/gerenciar',
          label: 'Desafios',
          icon: 'desafios',
          description: 'Configuração de desafios',
        },
        {
          href: '/liga/gerenciar',
          label: 'Ligas',
          icon: 'liga',
          description: 'Configuração de ligas',
        },
      ],
    },
    {
      label: 'Gestão',
      items: [
        {
          href: '/historico',
          label: 'Histórico',
          icon: 'historico',
          description: 'Relatórios e evolução',
        },
        {
          href: '/analytics-emails',
          label: 'Comunicação',
          icon: 'analytics',
          description: 'Entrega e leitura de mensagens',
        },
        {
          href: '/company-profile',
          label: 'Perfil da empresa',
          icon: 'profile',
          description: 'Dados e identidade corporativa',
        },
        {
          href: '/gamificacao-config',
          label: 'Gamificação',
          icon: 'config',
          description: 'Configuração em revisão de privacidade',
        },
      ],
    },
  ],
  lideranca: [
    {
      label: 'Equipe',
      items: [
        {
          href: '/dashboard',
          label: 'Início',
          icon: 'dashboard',
          description: 'Resumo da equipe',
        },
        {
          href: '/semaforo',
          label: 'Semáforo da equipe',
          icon: 'semaforo',
          description: 'Indicadores agregados',
        },
        {
          href: '/campanhas',
          label: 'Campanhas',
          icon: 'campanhas',
          description: 'Campanhas disponíveis',
        },
      ],
    },
  ],
  colaboradora: [
    {
      label: 'Minha jornada',
      items: [
        {
          href: '/colaboradora',
          label: 'Hoje',
          icon: 'dashboard',
          description: 'Seu foco e suas próximas ações',
        },
        {
          href: '/comunidade',
          label: 'Comunidade',
          icon: 'community',
          description: 'Conteúdos editoriais da sua empresa',
        },
        {
          href: '/semaforo',
          label: 'Meu semáforo',
          icon: 'semaforo',
          description: 'Sua leitura de cuidado',
        },
        {
          href: '/agenda',
          label: 'Minha agenda',
          icon: 'agenda',
          description: 'Exames, consultas e lembretes',
        },
      ],
    },
    {
      label: 'Evolução',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas',
          icon: 'campanhas',
          description: 'Conteúdos e ações disponíveis',
        },
        {
          href: '/objetivos',
          label: 'Objetivos',
          icon: 'objetivos',
          description: 'Metas de bem-estar',
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
        {
          href: '/liga',
          label: 'Liga semanal',
          icon: 'liga',
          description: 'Participação e comunidade',
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
  '/historico',
  '/company-profile',
  '/gamificacao-config',
  '/convites',
  '/comunidade',
] as const;

describe('platform navigation', () => {
  it('keeps the exhaustive role registry aligned with the navigation table', () => {
    expect(USER_ROLES).toEqual(Object.keys(EXPECTED_NAVIGATION));
  });

  it.each(USER_ROLES)('returns the exact navigation table for %s', (role) => {
    expect(getNavigationForRole(role)).toEqual(EXPECTED_NAVIGATION[role]);
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
    expect(isNavigationItemActive('/desafios-gerenciar', '/desafios')).toBe(false);
    expect(isNavigationItemActive('/administer', '/admin')).toBe(false);
    expect(isNavigationItemActive('/', '/')).toBe(true);
    expect(isNavigationItemActive('/dashboard', '/')).toBe(false);
  });
});
