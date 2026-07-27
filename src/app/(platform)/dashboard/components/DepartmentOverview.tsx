import { FeedbackState } from '@/components/ui/FeedbackState';
import type { ProtectedDepartmentMetric } from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';
import type { CSSProperties } from 'react';
import styles from '../dashboard.module.css';

function assertNever(value: never): never {
  throw new Error(`Estado protegido desconhecido: ${JSON.stringify(value)}`);
}

function renderMetric(metric: ProtectedMetric<number>): string {
  switch (metric.status) {
    case 'visible':
      return String(metric.value);
    case 'suppressed':
      return metric.message;
    default:
      return assertNever(metric);
  }
}

function visibleValue(metric: ProtectedMetric<number>): number | null {
  return metric.status === 'visible' ? metric.value : null;
}

function chartScale(value: number | null, maxValue: number): CSSProperties {
  return {
    '--chart-scale': value === null || maxValue <= 0 ? 0 : Math.max(0.04, value / maxValue),
  } as CSSProperties;
}

export function DepartmentOverview({ departments }: { departments: ProtectedDepartmentMetric[] }) {
  const visibleValues = departments
    .map((department) => visibleValue(department.metric))
    .filter((value): value is number => value !== null);
  const maxValue = Math.max(1, ...visibleValues);

  return (
    <section className={`${styles.surface} ${styles.wide}`} aria-labelledby="departments-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Departamentos</p>
          <h3 id="departments-title" className={styles.sectionTitle}>Contribuintes ativos por área</h3>
        </div>
      </div>
      {departments.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Nenhum departamento neste recorte"
          description="Ajuste o filtro para consultar outro escopo."
        />
      ) : (
        <ul className={styles.dataList} aria-label="Gráfico protegido de contribuintes por área">
          {departments.map((department) => (
            <li key={department.id} className={styles.departmentRow}>
              <div className={styles.rowHeading}>
                <strong>{department.name}</strong>
                <span className={styles.rowMetric}>{renderMetric(department.metric)}</span>
              </div>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={department.metric.status === 'visible' ? styles.chartFill : styles.chartProtected}
                  style={chartScale(visibleValue(department.metric), maxValue)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
