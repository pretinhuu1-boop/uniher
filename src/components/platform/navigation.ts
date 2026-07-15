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
        {
          href: '/agenda',
          label: 'Agenda de saúde',
          icon: 'agenda',
          description: 'Ações e lembretes de cuidado',
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
          description: 'Regras de XP, vidas e recompensas',
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
        {
          href: '/agenda',
          label: 'Agenda',
          icon: 'agenda',
          description: 'Próximas ações de saúde',
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
