import { FeedbackState } from '@/components/ui/FeedbackState';
import type { ProtectedAgeMetric } from '@/types/platform';
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

export function AgeOverview({ data }: { data: ProtectedAgeMetric[] }) {
  return (
    <section className={styles.surface} aria-labelledby="age-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Distribui\u00e7\u00e3o</p>
          <h3 id="age-title" className={styles.sectionTitle}>Faixas et\u00e1rias protegidas</h3>
        </div>
      </div>
      {data.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Distribui\u00e7\u00e3o indispon\u00edvel"
          description="A faixa ser\u00e1 exibida quando houver dados eleg\u00edveis."
        />
      ) : (
        <ul className={styles.legendList}>
          {data.map((item) => (
            <li key={item.label}>
              <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
              <strong>{renderMetric(item.metric)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
