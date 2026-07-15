import type {
  AgeDistribution,
  CampaignStatus,
  DashboardKPI,
  Department,
  EngagementDataPoint,
  ROIProjection,
} from '@/types/platform';

export interface DashboardSource {
  kpis: DashboardKPI[];
  departments: Department[];
  campaigns: CampaignStatus[];
  roi: ROIProjection;
  engagement: EngagementDataPoint[];
  ageDistribution: AgeDistribution[];
}

export interface DashboardSummaryItem {
  label: 'Participação ativa' | 'Ações em andamento' | 'Pontos de atenção';
  value: string | number;
  detail: string;
  state: 'neutral' | 'positive' | 'warning';
}

export interface DashboardAction {
  label: 'Campanhas' | 'Convites' | 'Histórico';
  description: string;
  href: '/campanhas' | '/convites' | '/historico';
}

export interface DashboardDepartmentAggregate {
  id: string;
  name: string;
  engagementPercent: number;
  trend: Department['trend'];
  color: string;
}

export interface DashboardViewModel {
  summary: DashboardSummaryItem[];
  actions: DashboardAction[];
  departments: DashboardDepartmentAggregate[];
  campaigns: CampaignStatus[];
  roi: ROIProjection;
  engagement: EngagementDataPoint[];
  ageDistribution: AgeDistribution[];
}

const ACTIONS: DashboardAction[] = [
  {
    label: 'Campanhas',
    description: 'Acompanhe as ações de saúde em andamento.',
    href: '/campanhas',
  },
  {
    label: 'Convites',
    description: 'Inclua novas colaboradoras na empresa.',
    href: '/convites',
  },
  {
    label: 'Histórico',
    description: 'Consulte a evolução dos indicadores agregados.',
    href: '/historico',
  },
];

function getParticipation(kpis: DashboardKPI[]): string {
  const engagementKpi = kpis.find(
    (kpi) => kpi.label.trim().toLocaleLowerCase('pt-BR') === 'engajamento',
  );

  if (!engagementKpi) return '0%';
  if (typeof engagementKpi.value === 'number') return `${engagementKpi.value}%`;

  const value = engagementKpi.value.trim();
  if (!value) return '0%';
  return /^\d+(?:[.,]\d+)?$/.test(value) ? `${value}%` : value;
}

export function createDashboardViewModel(source: DashboardSource): DashboardViewModel {
  const activeCampaigns = source.campaigns.filter((campaign) => campaign.status === 'active').length;
  const departmentsNeedingAttention = source.departments.filter(
    (department) => department.engagementPercent < 70,
  ).length;

  return {
    summary: [
      {
        label: 'Participação ativa',
        value: getParticipation(source.kpis),
        detail: 'últimos 30 dias',
        state: 'positive',
      },
      {
        label: 'Ações em andamento',
        value: activeCampaigns,
        detail: 'campanhas ativas',
        state: 'neutral',
      },
      {
        label: 'Pontos de atenção',
        value: departmentsNeedingAttention,
        detail: 'departamentos abaixo de 70%',
        state: departmentsNeedingAttention > 0 ? 'warning' : 'positive',
      },
    ],
    actions: ACTIONS,
    departments: source.departments.map((department) => ({
      id: department.id,
      name: department.name,
      engagementPercent: department.engagementPercent,
      trend: department.trend,
      color: department.color,
    })),
    campaigns: source.campaigns.map((campaign) => ({
      name: campaign.name,
      month: campaign.month,
      progress: campaign.progress,
      status: campaign.status,
      statusLabel: campaign.statusLabel,
      color: campaign.color,
    })),
    roi: source.roi,
    engagement: source.engagement,
    ageDistribution: source.ageDistribution,
  };
}
