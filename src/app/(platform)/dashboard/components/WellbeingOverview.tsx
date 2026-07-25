import type { ProtectedWellbeingSeriesMetric } from '@/types/platform';
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

export function WellbeingOverview({
  series,
}: {
  series: ProtectedWellbeingSeriesMetric[];
}) {
  return (
    <section className={`${styles.surface} ${styles.wide}`} aria-labelledby="wellbeing-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Meu Bem-Estar</p>
          <h3 id="wellbeing-title" className={styles.sectionTitle}>Check-in x Check-out</h3>
          <p className={styles.sectionDescription}>
            Contagem agregada de colaboradoras distintas, com supressão por coorte.
          </p>
        </div>
      </div>
      <ul className={styles.comparisonList}>
        {series.map((point) => (
          <li key={point.period}>
            <strong>{point.period}</strong>
            <span>Check-in: {renderMetric(point.checkIn)}</span>
            <span>Check-out: {renderMetric(point.checkOut)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
