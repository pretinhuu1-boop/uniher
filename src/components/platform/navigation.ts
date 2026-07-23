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
    description: 'Modulo contratado de cuidado primario, visivel conforme governanca',
  },
  concierge: {
    href: '/concierge',
    icon: 'profile',
    description: 'Acompanhamento de casos somente para empresas com Concierge contratado',
  },
  education: {
    href: '/campanhas',
    icon: 'campanhas',
    description: 'Campanhas, trilhas, videos e conteudos educativos',
  },
  achievements: {
    href: '/conquistas',
    icon: 'conquistas',
    description: 'Objetivos, desafios, conquistas e gamificacao aprovada',
  },
  nr1: {
    href: '/avaliacao-nr1',
    icon: 'historico',
    description: 'Avaliacao psicossocial NR-1 sob contrato e gates Yavix',
  },
  sipat: {
    href: '/viva-sipat',
    icon: 'campanhas',
    description: 'Campanhas, materiais e acoes SIPAT quando o conteudo fonte for aprovado',
  },
  human_development: {
    href: '/desenvolvimento-humano',
    icon: 'objetivos',
    description: 'Conteudos de desenvolvimento humano contratados pela empresa',
  },
  denunciation: {
    href: '/canal-denuncias',
    icon: 'config',
    description: 'Canal parceiro para denuncias, governado por contrato especifico',
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
    if (existingRoutes.has(navigation.href)) return [];

    return [{
      href: navigation.href,
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
      label: 'Modulos',
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
