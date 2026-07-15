import { FeedbackState } from '@/components/ui/FeedbackState';
import type { DashboardDepartmentAggregate } from '../dashboard-view-model';
import styles from '../dashboard.module.css';

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function DepartmentOverview({ departments }: { departments: DashboardDepartmentAggregate[] }) {
  return (
    <section className={`${styles.surface} ${styles.wide}`} aria-labelledby="departments-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Departamentos</p>
          <h3 id="departments-title" className={styles.sectionTitle}>Engajamento por área</h3>
        </div>
      </div>
      {departments.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Nenhum departamento neste recorte"
          description="Ajuste os filtros ou cadastre departamentos para comparar o engajamento."
        />
      ) : (
        <ul className={styles.dataList}>
          {departments.slice(0, 5).map((department) => (
            <li key={department.id} className={styles.departmentRow}>
              <div className={styles.rowHeading}>
                <strong>{department.name}</strong>
                <span>{department.engagementPercent}%</span>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${clampPercent(department.engagementPercent)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
