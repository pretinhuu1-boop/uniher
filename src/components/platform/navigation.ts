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
      label: 'Dashboard geral',
      items: [
        {
          href: '/admin',
          label: 'Dashboard geral',
          icon: 'companies',
          description: 'Empresas, usuários e integridade operacional da plataforma',
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
          description: 'Lista, ambientes, usuários, permissões e configurações de empresas',
        },
      ],
    },
    {
      label: 'Saúde Primária',
      items: [
        {
          href: '/saude-primaria',
          label: 'Saúde Primária',
          icon: 'semaforo',
          description: 'Visão agregada futura do Semáforo, bloqueada por governança clínica',
        },
        {
          href: '/concierge',
          label: 'Concierge',
          icon: 'profile',
          description: 'Gestão de casos somente quando o módulo e contrato estiverem aprovados',
        },
        {
          href: '/historico',
          label: 'Dashboard de exames',
          icon: 'historico',
          description: 'Base existente para relatórios e acompanhamento de exames',
        },
      ],
    },
    {
      label: 'Educação',
      items: [
        {
          href: '/comunidade/gerenciar',
          label: 'Educação',
          icon: 'community',
          description: 'Conteúdos editoriais e campanhas educativas das empresas',
        },
      ],
    },
    {
      label: 'Gamificação',
      items: [
        {
          href: '/gamificacao-config',
          label: 'Gamificação',
          icon: 'config',
          description: 'Governança de desafios, recompensas e rankings aprovados',
        },
      ],
    },
    {
      label: 'Produtos e Módulos',
      items: [
        {
          href: '/produtos-modulos',
          label: 'Produtos e Módulos',
          icon: 'config',
          description: 'Controle administrativo em preparação para módulos contratados',
        },
      ],
    },
    {
      label: 'Relatórios',
      items: [
        {
          href: '/analytics-emails',
          label: 'Relatórios',
          icon: 'analytics',
          description: 'Comunicação e atividade agregada da plataforma',
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
          description: 'Administradores UniHER, permissões e configurações globais no painel master',
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
          description: 'Visão geral, atenção, ações e impacto da empresa',
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
      label: 'Educação',
      items: [
        {
          href: '/campanhas',
          label: 'Campanhas e trilhas',
          icon: 'campanhas',
          description: 'Planejar campanhas, trilhas e conteúdos educativos',
        },
        {
          href: '/comunidade/gerenciar',
          label: 'Conteúdos educativos',
          icon: 'community',
          description: 'Publicar e organizar conteúdos da comunidade',
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
          label: 'Configuração de conquistas',
          icon: 'config',
          description: 'Governar objetivos, desafios e gamificação aprovada',
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
      label: 'Meu bem-estar',
      items: [
        {
          href: '/colaboradora',
          label: 'Hoje',
          icon: 'dashboard',
          description: 'Check-in, foco do dia e próximas ações',
        },
        {
          href: '/agenda',
          label: 'Minha agenda de exames',
          icon: 'agenda',
          description: 'Exames, consultas, lembretes e histórico',
        },
      ],
    },
    {
      label: 'Saúde Primária',
      items: [
        {
          href: '/semaforo',
          label: 'Meu semáforo',
          icon: 'semaforo',
          description: 'Leitura individual de cuidado em superfície contida',
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
          description: 'Conteúdos, trilhas e ações educativas disponíveis',
        },
        {
          href: '/comunidade',
          label: 'Comunidade',
          icon: 'community',
          description: 'Conteúdos editoriais da sua empresa',
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
} as const satisfies Readonly<Record<UserRole, readonly NavigationGroup[]>>;

type NavigationModuleRow = Pick<CompanyModuleRecord, 'module_slug' | 'module_state' | 'visible'>;

const MODULE_NAVIGATION: Readonly<Record<CompanyModuleSlug, {
  href: string;
  icon: NavigationIcon;
  description: string;
}>> = {
  primary_health: {
    href: '/saude-primaria',
    icon: 'semaforo',
    description: 'Módulo contratado de cuidado primário, visível conforme governança',
  },
  concierge: {
    href: '/concierge',
    icon: 'profile',
    description: 'Acompanhamento de casos somente para empresas com Concierge contratado',
  },
  education: {
    href: '/campanhas',
    icon: 'campanhas',
    description: 'Campanhas, trilhas, vídeos e conteúdos educativos',
  },
  achievements: {
    href: '/conquistas',
    icon: 'conquistas',
    description: 'Objetivos, desafios, conquistas e gamificação aprovada',
  },
  nr1: {
    href: '/avaliacao-nr1',
    icon: 'historico',
    description: 'Avaliação psicossocial NR-1 sob contrato e gates Yavix',
  },
  sipat: {
    href: '/viva-sipat',
    icon: 'campanhas',
    description: 'Campanhas, materiais e ações SIPAT quando o conteúdo fonte for aprovado',
  },
  human_development: {
    href: '/desenvolvimento-humano',
    icon: 'objetivos',
    description: 'Conteúdos de desenvolvimento humano contratados pela empresa',
  },
  denunciation: {
    href: '/canal-denuncias',
    icon: 'config',
    description: 'Canal parceiro para denúncias, governado por contrato específico',
  },
};

const MODULE_STATE_BADGES: Readonly<Record<Exclude<CompanyModuleState, 'enabled'>, string>> = {
  locked: 'Bloqueado',
  coming_soon: 'Em breve',
  partner_managed: 'Parceiro',
  requires_contract: 'Contrato',
};

function getModuleBadgeLabel(moduleState: CompanyModuleState): string | undefined {
  return moduleState === 'enabled' ? undefined : MODULE_STATE_BADGES[moduleState];
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

function getExistingRoutes(groups: readonly NavigationGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.href)));
}

function getModuleNavigationItems(
  role: UserRole,
  companyModules: readonly NavigationModuleRow[],
  existingRoutes: ReadonlySet<string>,
): NavigationItem[] {
  return companyModules.flatMap((module) => {
    if (module.visible !== 1) return [];

    const definition = COMPANY_MODULE_DEFINITIONS.find((item) => item.slug === module.module_slug);
    if (!definition || !definition.visibleForRoles.includes(role)) return [];

    const navigation = MODULE_NAVIGATION[module.module_slug];
    const href = getModuleNavigationHref(role, module.module_slug, module.module_state);
    if (existingRoutes.has(href)) return [];

    return [{
      href,
      label: definition.label,
      icon: navigation.icon,
      description: navigation.description,
      moduleSlug: module.module_slug,
      moduleState: module.module_state,
      badgeLabel: getModuleBadgeLabel(module.module_state),
    }];
  });
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
  const baseGroups = NAVIGATION[normalizedRole];
  const moduleItems = getModuleNavigationItems(
    normalizedRole,
    companyModules,
    getExistingRoutes(baseGroups),
  );

  if (moduleItems.length === 0) return baseGroups;

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

const QUERY_DISTINCT_PATHS = new Set(['/admin']);

function splitLocation(value: string): { path: string; query: string } {
  const [path, query = ''] = value.split('?');
  return { path, query };
}

export function isNavigationItemActive(currentLocation: string, href: string): boolean {
  const current = splitLocation(currentLocation);
  const target = splitLocation(href);

  if (target.query) {
    return current.path === target.path && current.query === target.query;
  }

  if (current.query && current.path === target.path && QUERY_DISTINCT_PATHS.has(target.path)) {
    return false;
  }

  return current.path === target.path || (target.path !== '/' && current.path.startsWith(`${target.path}/`));
}
