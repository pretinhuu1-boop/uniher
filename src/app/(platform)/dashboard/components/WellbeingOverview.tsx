import type { ProtectedWellbeingSeriesMetric } from '@/types/platform';
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

export function WellbeingOverview({
  series,
}: {
  series: ProtectedWellbeingSeriesMetric[];
}) {
  const visibleValues = series.flatMap((point) => [
    visibleValue(point.checkIn),
    visibleValue(point.checkOut),
  ]).filter((value): value is number => value !== null);
  const maxValue = Math.max(1, ...visibleValues);

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
      <ul className={styles.comparisonList} aria-label="Gráfico protegido de check-in e check-out por período">
        {series.map((point) => (
          <li key={point.period}>
            <strong>{point.period}</strong>
            <div className={styles.comparisonMetric}>
              <span>Check-in: {renderMetric(point.checkIn)}</span>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={point.checkIn.status === 'visible' ? styles.chartFill : styles.chartProtected}
                  style={chartScale(visibleValue(point.checkIn), maxValue)}
                />
              </span>
            </div>
            <div className={styles.comparisonMetric}>
              <span>Check-out: {renderMetric(point.checkOut)}</span>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={point.checkOut.status === 'visible' ? styles.chartFillAlt : styles.chartProtected}
                  style={chartScale(visibleValue(point.checkOut), maxValue)}
                />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
