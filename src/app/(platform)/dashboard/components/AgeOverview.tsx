import { FeedbackState } from '@/components/ui/FeedbackState';
import type { ProtectedAgeMetric } from '@/types/platform';
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

export function AgeOverview({ data }: { data: ProtectedAgeMetric[] }) {
  const visibleValues = data
    .map((item) => visibleValue(item.metric))
    .filter((value): value is number => value !== null);
  const maxValue = Math.max(1, ...visibleValues);

  return (
    <section className={styles.surface} aria-labelledby="age-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Distribuição</p>
          <h3 id="age-title" className={styles.sectionTitle}>Faixas etárias protegidas</h3>
        </div>
      </div>
      {data.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Distribuição indisponível"
          description="A faixa será exibida quando houver dados elegíveis."
        />
      ) : (
        <ul className={styles.legendList} aria-label="Gráfico protegido de faixas etárias">
          {data.map((item) => (
            <li key={item.label}>
              <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
              <strong>{renderMetric(item.metric)}</strong>
              <span className={styles.chartTrack} aria-hidden="true">
                <span
                  className={item.metric.status === 'visible' ? styles.chartFill : styles.chartProtected}
                  style={chartScale(visibleValue(item.metric), maxValue)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
