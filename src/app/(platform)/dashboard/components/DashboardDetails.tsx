import { DASHBOARD_PERIODS } from '@/types/platform';
import type { DashboardPeriod } from '@/types/platform';
import type { DashboardViewModel } from '../dashboard-view-model';
import styles from '../dashboard.module.css';
import { AgeOverview } from './AgeOverview';
import { DepartmentOverview } from './DepartmentOverview';

export interface DashboardFilters {
  period: DashboardPeriod;
  departmentId: string;
}

interface DashboardDetailsProps {
  model: DashboardViewModel;
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

export function DashboardDetails({ model, filters, onFiltersChange }: DashboardDetailsProps) {
  return (
    <section className={styles.details} aria-labelledby="details-title">
      <div className={styles.detailsHeading}>
        <div>
          <p className={styles.eyebrow}>Leitura detalhada</p>
          <h2 id="details-title" className={styles.sectionTitle}>Indicadores protegidos</h2>
        </div>
        <div className={styles.filters} aria-label="Filtros do dashboard">
          <div className={styles.periodGroup} aria-label="Per\u00edodo">
            {DASHBOARD_PERIODS.map((period) => (
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
            value={filters.departmentId}
            onChange={(event) => onFiltersChange({ ...filters, departmentId: event.target.value })}
          >
            <option value="">Todos os departamentos</option>
            {model.departments.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.detailsGrid}>
        <DepartmentOverview departments={model.departments} />
        <AgeOverview data={model.ageDistribution} />
      </div>
    </section>
  );
}
