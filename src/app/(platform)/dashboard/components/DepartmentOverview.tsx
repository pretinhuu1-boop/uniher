import { FeedbackState } from '@/components/ui/FeedbackState';
import type { ProtectedDepartmentMetric } from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';
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

export function DepartmentOverview({ departments }: { departments: ProtectedDepartmentMetric[] }) {
  return (
    <section className={`${styles.surface} ${styles.wide}`} aria-labelledby="departments-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Departamentos</p>
          <h3 id="departments-title" className={styles.sectionTitle}>Contribuintes ativos por \u00e1rea</h3>
        </div>
      </div>
      {departments.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Nenhum departamento neste recorte"
          description="Ajuste o filtro para consultar outro escopo."
        />
      ) : (
        <ul className={styles.dataList}>
          {departments.map((department) => (
            <li key={department.id} className={styles.departmentRow}>
              <strong>{department.name}</strong>
              <span>{renderMetric(department.metric)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
