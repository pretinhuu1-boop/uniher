import type { DashboardDepartmentAggregate, DashboardViewModel } from '../dashboard-view-model';
import styles from '../dashboard.module.css';
import { AgeOverview } from './AgeOverview';
import { CampaignOverview } from './CampaignOverview';
import { DepartmentOverview } from './DepartmentOverview';

export const PERIOD_OPTIONS = ['1m', '3m', '6m', '1a'] as const;
export type DashboardPeriod = (typeof PERIOD_OPTIONS)[number];

export interface DashboardFilters {
  period: DashboardPeriod;
  department: string;
  attention: string;
}

interface DashboardDetailsProps {
  model: DashboardViewModel;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

function matchesAttention(department: DashboardDepartmentAggregate, attention: string): boolean {
  if (attention === 'healthy') return department.engagementPercent >= 70;
  if (attention === 'attention') return department.engagementPercent >= 50 && department.engagementPercent < 70;
  if (attention === 'priority') return department.engagementPercent < 50;
  return true;
}

export function DashboardDetails({ model, filters, onFiltersChange }: DashboardDetailsProps) {
  const departments = model.departments.filter((department) => (
    (!filters.department || department.name === filters.department)
    && matchesAttention(department, filters.attention)
  ));

  return (
    <section className={styles.details} aria-labelledby="details-title">
      <div className={styles.detailsHeading}>
        <div>
          <p className={styles.eyebrow}>Leitura detalhada</p>
          <h2 id="details-title" className={styles.sectionTitle}>Indicadores agregados</h2>
        </div>
        <div className={styles.filters} aria-label="Filtros do dashboard">
          <div className={styles.periodGroup} aria-label="Período">
            {PERIOD_OPTIONS.map((period) => (
              <button
                key={period}
                type="button"
                aria-pressed={filters.period === period}
                onClick={() => onFiltersChange({ ...filters, period })}
              >
                {period}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar por departamento"
            value={filters.department}
            onChange={(event) => onFiltersChange({ ...filters, department: event.target.value })}
          >
            <option value="">Todos os departamentos</option>
            {model.departments.map((department) => (
              <option key={department.id} value={department.name}>{department.name}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por faixa de engajamento"
            value={filters.attention}
            onChange={(event) => onFiltersChange({ ...filters, attention: event.target.value })}
          >
            <option value="">Todas as faixas</option>
            <option value="healthy">Na referência</option>
            <option value="attention">Atenção</option>
            <option value="priority">Prioridade</option>
          </select>
        </div>
      </div>
      <div className={styles.roiRow} data-testid="dashboard-roi">
        <div><span>Impacto estimado</span><strong>{model.roi.roiMultiplier}x ROI</strong></div>
        <div><span>Economia anual</span><strong>{model.roi.savings}</strong></div>
        <div><span>Redução de absenteísmo</span><strong>{model.roi.absenteeismReduction}</strong></div>
      </div>
      <div className={styles.detailsGrid}>
        <DepartmentOverview departments={departments} />
        <CampaignOverview campaigns={model.campaigns} />
        <AgeOverview data={model.ageDistribution} />
      </div>
    </section>
  );
}
