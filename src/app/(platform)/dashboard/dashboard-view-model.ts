import type {
  ProtectedAgeMetric,
  ProtectedDashboardMetrics,
  ProtectedDashboardProjection,
  ProtectedDepartmentMetric,
  ProtectedSeriesMetric,
} from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';

export interface DashboardSummaryItem {
  label: 'Atividade de exames' | 'Engajamento' | 'Participa\u00e7\u00e3o em campanha';
  metric: ProtectedMetric<number>;
  detail: string;
  state: 'neutral';
}

export interface DashboardAction {
  readonly label: 'Campanhas' | 'Convites' | 'Hist\u00f3rico';
  readonly description: string;
  readonly href: '/campanhas' | '/convites' | '/historico';
}

export interface DashboardViewModel {
  summary: DashboardSummaryItem[];
  actions: readonly DashboardAction[];
  metrics: ProtectedDashboardMetrics;
  departments: ProtectedDepartmentMetric[];
  ageDistribution: ProtectedAgeMetric[];
  examActivitySeries: ProtectedSeriesMetric[];
}

const ACTION_BLUEPRINTS: readonly DashboardAction[] = [
  {
    label: 'Campanhas',
    description: 'Gerencie as campanhas sem expor participa\u00e7\u00e3o individual.',
    href: '/campanhas',
  },
  {
    label: 'Convites',
    description: 'Inclua novas colaboradoras na empresa.',
    href: '/convites',
  },
  {
    label: 'Hist\u00f3rico',
    description: 'Consulte a disponibilidade do registro protegido.',
    href: '/historico',
  },
];

export function createDashboardViewModel(
  source: ProtectedDashboardProjection,
): DashboardViewModel {
  return {
    summary: [
      {
        label: 'Atividade de exames',
        metric: source.metrics.examActivity,
        detail: 'contribuintes distintos no per\u00edodo',
        state: 'neutral',
      },
      {
        label: 'Engajamento',
        metric: source.metrics.engagement,
        detail: 'fonte legada n\u00e3o comput\u00e1vel',
        state: 'neutral',
      },
      {
        label: 'Participa\u00e7\u00e3o em campanha',
        metric: source.metrics.campaignParticipation,
        detail: 'aguardando classifica\u00e7\u00e3o de sensibilidade',
        state: 'neutral',
      },
    ],
    actions: Object.freeze(
      ACTION_BLUEPRINTS.map((action) => Object.freeze({ ...action })),
    ),
    metrics: source.metrics,
    departments: source.departments.map((department) => ({ ...department })),
    ageDistribution: source.ageDistribution.map((bucket) => ({ ...bucket })),
    examActivitySeries: source.examActivitySeries.map((point) => ({ ...point })),
  };
}
