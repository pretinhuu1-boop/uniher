import type { UserRole } from '@/types/platform';
import {
  COMPANY_MODULE_DEFINITIONS,
  type CompanyModuleRecord,
  type CompanyModuleSlug,
  type CompanyModuleState,
} from '@/types/modules';

export const USER_ROLES = ['admin', 'rh', 'lideranca', 'colaboradora'] as const satisfies readonly UserRole[];

export const NAVIGATION_ICONS = [
  'dashboard',
  'companies',
  'analytics',
  'colaboradoras',
  'departamentos',
  'semaforo',
  'campanhas',
  'community',
  'objetivos',
  'desafios',
  'liga',
  'agenda',
  'historico',
  'invite',
  'profile',
  'config',
  'notifications',
  'conquistas',
] as const;

export type NavigationIcon = typeof NAVIGATION_ICONS[number];

export interface NavigationItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavigationIcon;
  readonly description: string;
  readonly moduleSlug?: CompanyModuleSlug;
  readonly moduleState?: CompanyModuleState;
  readonly badgeLabel?: string;
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

const NAVIGATION = {
  admin: [
    {
      label: 'Principal',
      items: [
        {
          href: '/admin',
          label: 'Dashboard geral',
          icon: 'dashboard',
          description: 'Visão consolidada de empresas e indicadores da plataforma',
        },
        {
          href: '/admin?tab=empresas',
          label: 'Empresas',
          icon: 'companies',
          description: 'Empresas, usuarios, permissoes e produtos disponiveis',
        },
        {
          href: '/dashboard?section=saude-primaria',
          label: 'Saúde Primária',
          icon: 'semaforo',
          description: 'Semáforo consolidado e indicadores por empresa, setor e período',
        },
        {
          href: '/dashboard?section=exames',
          label: 'Dashboard de exames',
          icon: 'historico',
          description: 'Exames em dia, pendentes, vencidos e indicadores de prevenção',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Educação',
          icon: 'community',
          description: 'Campanhas e conteúdos educativos publicados para empresas',
        },
        {
          href: '/gamificacao-config',
          label: 'Objetivos e Desafios',
          icon: 'conquistas',
          description: 'Jornadas privadas de objetivos, desafios e conquistas',
        },
        {
          href: '/produtos-modulos',
          label: 'Produtos e Módulos',
          icon: 'config',
          description: 'Disponibilidade dos produtos e visibilidade sem ativacao automatica',
        },
        {
          href: '/analytics-emails',
          label: 'Relatórios',
          icon: 'analytics',
          description: 'Relatórios por empresa, consolidados, exportação de dados e ROI',
        },
        {
          href: '/admin?tab=sistema',
          label: 'Configurações',
          icon: 'config',
          description: 'Administradores, permissões e configurações gerais da plataforma',
        },
      ],
    },
    {
      label: 'Administração',
      items: [
        {
          href: '/admin?tab=admin',
          label: 'Administradores UniHER',
          icon: 'profile',
          description: 'Gestão dos administradores da plataforma',
        },
        {
          href: '/admin?tab=usuarios',
          label: 'Permissões de Acesso',
          icon: 'colaboradoras',
          description: 'Usuários, permissões e papéis administrativos',
        },
        {
          href: '/admin?tab=sistema&section=gerais',
          label: 'Configurações Gerais',
          icon: 'config',
          description: 'Parâmetros globais e integridade operacional',
        },
      ],
    },
  ],
  rh: [
    {
      label: 'Principal',
      items: [
        {
          href: '/dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          description: 'Visão geral da empresa, indicadores e gráficos protegidos',
        },
        {
          href: '/dashboard?section=saude-primaria',
          label: 'Saúde Primária',
          icon: 'semaforo',
          description: 'Semáforo da saúde com indicadores agregados sob gates clínicos',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Gestão editorial',
          icon: 'community',
          description: 'Criação, revisão e publicação de conteúdos da comunidade',
        },
        {
          href: '/campanhas',
          label: 'Educação',
          icon: 'campanhas',
          description: 'Campanhas e conteúdos educativos publicados para a empresa',
        },
        {
          href: '/gamificacao-config',
          label: 'Objetivos e Desafios',
          icon: 'conquistas',
          description: 'Objetivos, desafios e conquistas em jornadas privadas',
        },
      ],
    },
    {
      label: 'Configurações',
      items: [
        {
          href: '/company-profile',
          label: 'Configurações da Empresa',
          icon: 'profile',
          description: 'Dados, identidade e preferências corporativas',
        },
        {
          href: '/colaboradoras-gestao',
          label: 'Usuárias e Permissões',
          icon: 'colaboradoras',
          description: 'Colaboradoras, aprovações, perfis e status',
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
        {
          href: '/notificacoes',
          label: 'Notificações',
          icon: 'notifications',
          description: 'Alertas e avisos do sistema',
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
      label: 'Educação',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas e trilhas',
          icon: 'campanhas',
          description: 'Campanhas e conteúdos disponíveis',
        },
      ],
    },
  ],
  colaboradora: [
    {
      label: 'Principal',
      items: [
        {
          href: '/semaforo',
          label: 'Saúde Primária',
          icon: 'semaforo',
          description: 'Semáforo da Saúde',
        },
        {
          href: '/colaboradora',
          label: 'Meu Bem-Estar',
          icon: 'dashboard',
          description: 'Check-in e check-out privados do dia',
        },
        {
          href: '/agenda',
          label: 'Minha Agenda de Exames',
          icon: 'agenda',
          description: 'Agende e acompanhe seus exames',
        },
        {
          href: '/comunidade',
          label: 'Educação',
          icon: 'community',
          description: 'Conteúdos, trilhas e videoaulas',
        },
        {
          href: '/objetivos',
          label: 'Objetivos',
          icon: 'objetivos',
          description: 'Objetivos pessoais iniciados pela própria colaboradora',
        },
        {
          href: '/desafios',
          label: 'Desafios',
          icon: 'desafios',
          description: 'Desafios voluntarios e educativos da empresa',
        },
        {
          href: '/conquistas',
          label: 'Conquistas',
          icon: 'conquistas',
          description: 'Conquistas privadas derivadas de eventos elegíveis',
        },
        {
          href: '/campanhas',
          label: 'Campanhas',
          icon: 'campanhas',
          description: 'Ações e comunicados',
        },
      ],
    },
  ],
} as const satisfies Readonly<Record<UserRole, readonly NavigationGroup[]>>;

type NavigationModuleRow = Pick<CompanyModuleRecord, 'module_slug' | 'module_state' | 'visible'>;

const MODULE_NAVIGATION: Readonly<Record<CompanyModuleSlug, {
  href: string;
  icon: NavigationIcon;
  description: string;
}>> = {
  primary_health: {
    href: '/dashboard?section=saude-primaria',
    icon: 'semaforo',
    description: 'Cuidado primario visivel conforme disponibilidade da empresa',
  },
  concierge: {
    href: '/concierge',
    icon: 'profile',
    description: 'Acompanhamento de casos somente para empresas com Concierge disponivel',
  },
  education: {
    href: '/campanhas',
    icon: 'campanhas',
    description: 'Campanhas, trilhas, vídeos e conteúdos educativos',
  },
  achievements: {
    href: '/conquistas',
    icon: 'conquistas',
    description: 'Objetivos, desafios e conquistas privadas',
  },
  nr1: {
    href: '/avaliacao-nr1',
    icon: 'historico',
    description: 'Avaliacao psicossocial NR-1 somente quando houver liberacao operacional',
  },
  sipat: {
    href: '/viva-sipat',
    icon: 'campanhas',
    description: 'Campanhas, materiais e ações SIPAT quando o conteúdo fonte for aprovado',
  },
  human_development: {
    href: '/desenvolvimento-humano',
    icon: 'objetivos',
    description: 'Conteudos de desenvolvimento humano disponiveis para a empresa',
  },
  denunciation: {
    href: '/canal-denuncias',
    icon: 'config',
    description: 'Canal parceiro para denuncias quando houver liberacao especifica',
  },
};

const MODULE_STATE_BADGES: Readonly<Record<Exclude<CompanyModuleState, 'enabled'>, string>> = {
  locked: 'Bloqueado',
  coming_soon: 'Planejado',
  partner_managed: 'Parceiro',
  requires_contract: 'Aguardando liberacao',
};

const MODULE_NAVIGATION_RUNTIME_READY: Readonly<Record<CompanyModuleSlug, boolean>> = {
  primary_health: true,
  concierge: false,
  education: true,
  achievements: true,
  nr1: false,
  sipat: false,
  human_development: false,
  denunciation: false,
};

function getModuleBadgeLabel(moduleState: CompanyModuleState): string | undefined {
  return moduleState === 'enabled' ? undefined : MODULE_STATE_BADGES[moduleState];
}

function getRepresentedModuleBadgeLabel(
  role: UserRole,
  moduleSlug: CompanyModuleSlug,
  moduleState: CompanyModuleState,
): string | undefined {
  if (role === 'colaboradora' && moduleSlug === 'primary_health') return undefined;
  return getModuleBadgeLabel(moduleState);
}

function getRepresentedModuleHref(role: UserRole, moduleSlug: CompanyModuleSlug): string | undefined {
  if (moduleSlug === 'primary_health') {
    if (role === 'colaboradora') return '/semaforo';
    if (role === 'admin' || role === 'rh') return '/dashboard?section=saude-primaria';
  }

  if (moduleSlug === 'education') {
    if (role === 'admin') return '/comunidade/gerenciar';
    if (role === 'colaboradora') return '/comunidade';
    if (role === 'rh' || role === 'lideranca') return '/campanhas';
  }

  if (moduleSlug === 'achievements') {
    if (role === 'admin' || role === 'rh') return '/gamificacao-config';
    if (role === 'colaboradora') return '/conquistas';
  }

  if (moduleSlug === 'concierge') {
    if (role === 'admin') return '/concierge';
    if (role === 'rh') return '/dashboard?section=saude-primaria';
  }

  return undefined;
}

function getModuleNavigationHref(
  role: UserRole,
  moduleSlug: CompanyModuleSlug,
  moduleState: CompanyModuleState,
): string {
  if (moduleSlug === 'nr1') {
    if (moduleState !== 'enabled') return '/nr1';
    return role === 'colaboradora' || role === 'lideranca' ? '/avaliacao-nr1' : '/nr1';
  }

  return MODULE_NAVIGATION[moduleSlug].href;
}

function isModuleRepresentedInBaseNavigation(role: UserRole, moduleSlug: CompanyModuleSlug): boolean {
  return Boolean(getRepresentedModuleHref(role, moduleSlug));
}

function getModuleNavigationLabel(role: UserRole, moduleSlug: CompanyModuleSlug, fallback: string): string {
  if (role === 'colaboradora' && moduleSlug === 'sipat') return 'SIPAT';
  return fallback;
}

function getExistingRoutes(groups: readonly NavigationGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
}

function canShowModuleNavigationItem(role: UserRole, module: NavigationModuleRow): boolean {
  if (module.visible !== 1) return false;
  if (!MODULE_NAVIGATION_RUNTIME_READY[module.module_slug]) return false;
  if (module.module_state !== 'enabled') return false;
  return true;
}

function getModuleNavigationItems(
  role: UserRole,
  companyModules: readonly NavigationModuleRow[],
  existingRoutes: ReadonlySet<string>,
): NavigationItem[] {
  return companyModules.flatMap((module) => {
    if (!canShowModuleNavigationItem(role, module)) return [];

    const definition = COMPANY_MODULE_DEFINITIONS.find((item) => item.slug === module.module_slug);
    if (!definition || !definition.visibleForRoles.includes(role)) return [];
    if (isModuleRepresentedInBaseNavigation(role, module.module_slug)) return [];

    const navigation = MODULE_NAVIGATION[module.module_slug];
    const href = getModuleNavigationHref(role, module.module_slug, module.module_state);
    if (existingRoutes.has(href)) return [];

    return [{
      href,
      label: getModuleNavigationLabel(role, module.module_slug, definition.label),
      icon: navigation.icon,
      description: navigation.description,
      moduleSlug: module.module_slug,
      moduleState: module.module_state,
      badgeLabel: getModuleBadgeLabel(module.module_state),
    }];
  });
}

function applyModuleMetadataToBaseNavigation(
  role: UserRole,
  groups: readonly NavigationGroup[],
  companyModules: readonly NavigationModuleRow[],
): readonly NavigationGroup[] {
  const representedRowsByHref = new Map<string, NavigationModuleRow[]>();

  for (const module of companyModules) {
    if (module.visible !== 1) continue;

    const definition = COMPANY_MODULE_DEFINITIONS.find((item) => item.slug === module.module_slug);
    if (!definition || !definition.visibleForRoles.includes(role)) continue;

    const href = getRepresentedModuleHref(role, module.module_slug);
    if (!href) continue;

    representedRowsByHref.set(href, [...(representedRowsByHref.get(href) ?? []), module]);
  }

  if (representedRowsByHref.size === 0) return groups;

  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const rows = representedRowsByHref.get(item.href);
      if (!rows?.length) return item;

      const representative = rows.find((row) => row.module_state !== 'enabled') ?? rows[0];
      return {
        ...item,
        moduleSlug: representative.module_slug,
        moduleState: representative.module_state,
        badgeLabel: getRepresentedModuleBadgeLabel(role, representative.module_slug, representative.module_state),
      };
    }),
  }));
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.some((role) => role === value);
}

export function normalizeUserRole(value: unknown): UserRole {
  return isUserRole(value) ? value : 'colaboradora';
}

export function resolveActiveView(realRole: unknown, canSwitchView: boolean, savedView: unknown): UserRole {
  const role = normalizeUserRole(realRole);

  if (!canSwitchView || !isUserRole(savedView)) return role;
  if (savedView === 'colaboradora' || savedView === role) return savedView;
  return role;
}

export function getNavigationForRole(role: UserRole): readonly NavigationGroup[] {
  return NAVIGATION[normalizeUserRole(role)];
}

export function getModuleAwareNavigationForRole(
  role: UserRole,
  companyModules: readonly NavigationModuleRow[],
): readonly NavigationGroup[] {
  const normalizedRole = normalizeUserRole(role);
  const baseGroups = applyModuleMetadataToBaseNavigation(
    normalizedRole,
    NAVIGATION[normalizedRole],
    companyModules,
  );
  const moduleItems = getModuleNavigationItems(
    normalizedRole,
    companyModules,
    getExistingRoutes(baseGroups),
  );

  if (moduleItems.length === 0) return baseGroups;

  if (normalizedRole === 'rh' || normalizedRole === 'colaboradora') {
    const [principal, ...rest] = baseGroups;
    return [
      {
        ...principal,
        items: [...principal.items, ...moduleItems],
      },
      ...rest,
    ];
  }

  return [
    ...baseGroups,
    {
      label: 'Módulos',
      items: moduleItems,
    },
  ];
}

export function getRoleHome(role: UserRole): string {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'colaboradora') return '/colaboradora';
  return '/dashboard';
}

const QUERY_DISTINCT_PATHS = new Set(['/admin', '/dashboard']);
const SEMANTIC_QUERY_KEYS = new Set(['tab', 'section']);

function splitLocation(value: string): { path: string; query: string } {
  const [path, query = ''] = value.split('?');
  return { path, query };
}

function queryParamsMatch(currentQuery: string, targetQuery: string): boolean {
  const current = new URLSearchParams(currentQuery);
  const target = new URLSearchParams(targetQuery);

  for (const [key, value] of target) {
    if (current.get(key) !== value) return false;
  }

  for (const key of SEMANTIC_QUERY_KEYS) {
    if (!target.has(key) && current.has(key)) return false;
  }

  return true;
}

export function isNavigationItemActive(currentLocation: string, href: string): boolean {
  const current = splitLocation(currentLocation);
  const target = splitLocation(href);

  if (target.query) {
    return current.path === target.path && queryParamsMatch(current.query, target.query);
  }

  if (current.query && current.path === target.path && QUERY_DISTINCT_PATHS.has(target.path)) {
    return false;
  }

  return current.path === target.path || (target.path !== '/' && current.path.startsWith(`${target.path}/`));
}
