import type { UserRole } from '@/types/platform';

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
}

export interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

const NAVIGATION = {
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
          href: '/desafios/gerenciar',
          label: 'Desafios',
          icon: 'desafios',
          description: 'Configuração de desafios',
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
      ],
    },
  ],
} as const satisfies Readonly<Record<UserRole, readonly NavigationGroup[]>>;

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

export function getRoleHome(role: UserRole): string {
  const normalizedRole = normalizeUserRole(role);

  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'colaboradora') return '/colaboradora';
  return '/dashboard';
}

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}
