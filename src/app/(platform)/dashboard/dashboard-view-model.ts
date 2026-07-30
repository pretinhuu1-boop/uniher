import type {
  ProtectedAgeMetric,
  ProtectedDashboardMetrics,
  ProtectedDashboardProjection,
  ProtectedDepartmentMetric,
  ProtectedSeriesMetric,
  ProtectedWellbeingSeriesMetric,
} from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';

export interface DashboardSummaryItem {
  label: 'Atividade de exames' | 'Check-in' | 'Check-out' | 'Engajamento' | 'Participação em campanha';
  metric: ProtectedMetric<number>;
  detail: string;
  state: 'neutral';
}

export interface DashboardAction {
  readonly label: 'Campanhas' | 'Convites' | 'Dashboard de exames';
  readonly description: string;
  readonly href: '/campanhas' | '/convites' | '/dashboard?section=exames';
}

export interface DashboardViewModel {
  summary: DashboardSummaryItem[];
  actions: readonly DashboardAction[];
  metrics: ProtectedDashboardMetrics;
  departments: ProtectedDepartmentMetric[];
  ageDistribution: ProtectedAgeMetric[];
  examActivitySeries: ProtectedSeriesMetric[];
  wellbeingSeries: ProtectedWellbeingSeriesMetric[];
}

const ACTION_BLUEPRINTS: readonly DashboardAction[] = [
  {
    label: 'Campanhas',
    description: 'Gerencie as campanhas sem expor participação individual.',
    href: '/campanhas',
  },
  {
    label: 'Convites',
    description: 'Inclua novas colaboradoras na empresa.',
    href: '/convites',
  },
  {
    label: 'Dashboard de exames',
    description: 'Consulte a superfície consolidada de indicadores protegidos.',
    href: '/dashboard?section=exames',
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
        detail: 'contribuintes distintos no período',
        state: 'neutral',
      },
      {
        label: 'Check-in',
        metric: source.metrics.wellbeingCheckIn,
        detail: 'check-ins distintos no período',
        state: 'neutral',
      },
      {
        label: 'Check-out',
        metric: source.metrics.wellbeingCheckOut,
        detail: 'check-outs distintos no período',
        state: 'neutral',
      },
      {
        label: 'Engajamento',
        metric: source.metrics.engagement,
        detail: 'indicador agregado protegido',
        state: 'neutral',
      },
      {
        label: 'Participação em campanha',
        metric: source.metrics.campaignParticipation,
        detail: 'indicador protegido por privacidade',
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
    wellbeingSeries: source.wellbeingSeries.map((point) => ({ ...point })),
  };
}
