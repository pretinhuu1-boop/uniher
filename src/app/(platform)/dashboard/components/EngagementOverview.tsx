import type { ProtectedMetric } from '@/types/privacy';
import styles from '../dashboard.module.css';

function assertNever(value: never): never {
  throw new Error(`Estado protegido desconhecido: ${JSON.stringify(value)}`);
}

function renderMetric(metric: ProtectedMetric<never>): string {
  switch (metric.status) {
    case 'visible':
      return String(metric.value);
    case 'suppressed':
      return metric.message;
    default:
      return assertNever(metric);
  }
}

export function EngagementOverview({ metric }: { metric: ProtectedMetric<never> }) {
  return (
    <section className={styles.surface} aria-labelledby="engagement-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Participação</p>
          <h2 id="engagement-title" className={styles.sectionTitle}>Engajamento</h2>
        </div>
      </div>
      <p role="status">{renderMetric(metric)}</p>
    </section>
  );
}
