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

const EXPECTED_NAVIGATION_CONTRACT = {
  admin: [
    {
      label: 'Principal',
      items: [
        ['/admin', 'Dashboard geral'],
        ['/admin?tab=empresas', 'Empresas'],
        ['/dashboard?section=saude-primaria', 'Sa\u00fade Prim\u00e1ria'],
        ['/concierge', 'Concierge'],
        ['/dashboard?section=exames', 'Dashboard de exames'],
        ['/comunidade/gerenciar', 'Educa\u00e7\u00e3o'],
        ['/gamificacao-config', 'Gamifica\u00e7\u00e3o'],
        ['/admin?tab=empresas&section=modulos', 'Produtos e M\u00f3dulos'],
        ['/analytics-emails', 'Relat\u00f3rios'],
        ['/admin?tab=sistema', 'Configura\u00e7\u00f5es'],
      ],
    },
    {
      label: 'Administra\u00e7\u00e3o',
      items: [
        ['/admin?tab=admin', 'Administradores UniHER'],
        ['/admin?tab=usuarios', 'Permiss\u00f5es de Acesso'],
        ['/admin?tab=sistema&section=gerais', 'Configura\u00e7\u00f5es Gerais'],
      ],
    },
  ],
  rh: [
    {
      label: 'Principal',
      items: [
        ['/dashboard', 'Dashboard'],
        ['/dashboard?section=saude-primaria', 'Sa\u00fade Prim\u00e1ria'],
        ['/campanhas', 'Educa\u00e7\u00e3o'],
        ['/gamificacao-config', 'Conquistas'],
      ],
    },
    {
      label: 'Configura\u00e7\u00f5es',
      items: [
        ['/company-profile', 'Configura\u00e7\u00f5es da Empresa'],
        ['/colaboradoras-gestao', 'Usu\u00e1rias e Permiss\u00f5es'],
        ['/departamentos', 'Departamentos'],
        ['/convites', 'Convites'],
        ['/notificacoes', 'Notifica\u00e7\u00f5es'],
      ],
    },
  ],
  lideranca: [
    {
      label: 'Dashboard',
      items: [
        ['/dashboard', 'Dashboard da equipe'],
      ],
    },
    {
      label: 'Educa\u00e7\u00e3o',
      items: [
        ['/campanhas', 'Campanhas e trilhas'],
      ],
    },
  ],
  colaboradora: [
    {
      label: 'Principal',
      items: [
        ['/semaforo', 'Sa\u00fade Prim\u00e1ria'],
        ['/colaboradora', 'Meu Bem-Estar'],
        ['/agenda', 'Minha Agenda de Exames'],
        ['/comunidade', 'Educa\u00e7\u00e3o'],
        ['/conquistas', 'Conquistas'],
        ['/campanhas', 'Campanhas'],
      ],
    },
  ],
} as const satisfies Record<UserRole, readonly {
  readonly label: string;
  readonly items: readonly (readonly [href: string, label: string])[];
}[]>;

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

function navigationContract(role: UserRole) {
  return getNavigationForRole(role).map((group) => ({
    label: group.label,
    items: group.items.map((item) => [item.href, item.label] as const),
  }));
}

describe('platform navigation', () => {
  it('keeps the exhaustive role registry aligned with the navigation table', () => {
    expect(USER_ROLES).toEqual(Object.keys(EXPECTED_NAVIGATION_CONTRACT));
  });

  it.each(USER_ROLES)('returns the approved Paola navigation contract for %s', (role) => {
    expect(navigationContract(role)).toEqual(EXPECTED_NAVIGATION_CONTRACT[role]);
  });

  it('regroups existing Paola surfaces without adding base navigation routes', () => {
    const routesFor = (role: UserRole) => getNavigationForRole(role)
      .flatMap((group) => group.items.map((item) => item.href));
    const groupLabelsFor = (role: UserRole) => getNavigationForRole(role)
      .map((group) => group.label);

    expect(routesFor('rh')).toEqual([
      '/dashboard',
      '/dashboard?section=saude-primaria',
      '/campanhas',
      '/gamificacao-config',
      '/company-profile',
      '/colaboradoras-gestao',
      '/departamentos',
      '/convites',
      '/notificacoes',
    ]);
    expect(groupLabelsFor('rh')).toEqual(['Principal', 'Configurações']);

    expect(routesFor('colaboradora')).toEqual([
      '/semaforo',
      '/colaboradora',
      '/agenda',
      '/comunidade',
      '/conquistas',
      '/campanhas',
    ]);
    expect(groupLabelsFor('colaboradora')).toEqual(['Principal']);
  });

  it('covers the Admin Master taxonomy requested by Paola with safe existing destinations', () => {
    const groups = getNavigationForRole('admin');
    const labels = groups.map((group) => group.label);
    const routes = flatItems(groups).map((item) => item.href);

    expect(labels).toEqual([
      'Principal',
      'Administração',
    ]);
    expect(routes).toEqual([
      '/admin',
      '/admin?tab=empresas',
      '/dashboard?section=saude-primaria',
      '/concierge',
      '/dashboard?section=exames',
      '/comunidade/gerenciar',
      '/gamificacao-config',
      '/admin?tab=empresas&section=modulos',
      '/analytics-emails',
      '/admin?tab=sistema',
      '/admin?tab=admin',
      '/admin?tab=usuarios',
      '/admin?tab=sistema&section=gerais',
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
    expect(routes).toContain('/semaforo');
    expect(routes).toContain('/nr1');
    expect(routes).not.toContain('/avaliacao-nr1');
    expect(routes).toContain('/viva-sipat');
    expect(routes).toContain('/desenvolvimento-humano');
    expect(routes).toContain('/canal-denuncias');
    expect(routes).not.toContain('/concierge');
    expect(routes.filter((route) => route === '/campanhas')).toHaveLength(1);
    expect(routes.filter((route) => route === '/conquistas')).toHaveLength(1);
    expect(byLabel['Saúde Primária'].badgeLabel).toBe('Bloqueado');
    expect(byLabel.Educação.badgeLabel).toBeUndefined();
    expect(byLabel.Conquistas.badgeLabel).toBeUndefined();
    expect(byLabel['NR-1'].badgeLabel).toBe('Contrato');
    expect(byLabel.SIPAT.badgeLabel).toBe('Bloqueado');
    expect(byLabel['Canal de Den\u00fancias'].badgeLabel).toBe('Parceiro');
  });

  it('applies honest module state badges to represented RH base rows', () => {
    const items = flatItems(getModuleAwareNavigationForRole('rh', [
      moduleRow('primary_health', 'enabled'),
      moduleRow('concierge', 'requires_contract'),
      moduleRow('education', 'locked'),
      moduleRow('achievements', 'coming_soon'),
    ]));
    const byLabel = Object.fromEntries(items.map((item) => [item.label, item]));

    expect(byLabel['Saúde Primária'].badgeLabel).toBe('Contrato');
    expect(byLabel.Educação.badgeLabel).toBe('Bloqueado');
    expect(byLabel.Conquistas.badgeLabel).toBe('Em breve');
  });

  it('routes explicitly enabled NR-1 to the COPSOQ runtime while keeping gated rows on the locked shell', () => {
    const gatedRoutes = flatItems(getModuleAwareNavigationForRole('rh', [
      moduleRow('nr1', 'requires_contract'),
    ])).map((item) => item.href);
    const enabledRoutes = flatItems(getModuleAwareNavigationForRole('rh', [
      moduleRow('nr1', 'enabled'),
    ])).map((item) => item.href);
    const collaboratorRoutes = flatItems(getModuleAwareNavigationForRole('colaboradora', [
      moduleRow('nr1', 'enabled'),
    ])).map((item) => item.href);

    expect(gatedRoutes).toContain('/nr1');
    expect(gatedRoutes).not.toContain('/avaliacao-nr1');
    expect(enabledRoutes).toContain('/nr1');
    expect(enabledRoutes).not.toContain('/avaliacao-nr1');
    expect(collaboratorRoutes).toContain('/avaliacao-nr1');
    expect(collaboratorRoutes).not.toContain('/nr1');
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
    expect(rhRoutes).not.toContain('/concierge');
    expect(rhRoutes).toContain('/nr1');
    expect(rhRoutes).not.toContain('/avaliacao-nr1');
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
    expect(routesFor('rh')).toContain('/campanhas');
    expect(routesFor('rh')).not.toContain('/comunidade/gerenciar');
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
    expect(isNavigationItemActive('/admin?tab=empresas&from=sidebar', '/admin?tab=empresas')).toBe(true);
    expect(isNavigationItemActive('/admin?section=gerais&tab=sistema', '/admin?tab=sistema&section=gerais')).toBe(true);
    expect(isNavigationItemActive('/admin?tab=sistema', '/admin?tab=empresas')).toBe(false);
    expect(isNavigationItemActive('/admin?tab=sistema&section=gerais', '/admin?tab=sistema')).toBe(false);
    expect(isNavigationItemActive('/admin?tab=empresas', '/admin')).toBe(false);
    expect(isNavigationItemActive('/admin', '/admin?tab=empresas')).toBe(false);
  });
});
