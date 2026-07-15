import { Doughnut } from 'react-chartjs-2';

import { FeedbackState } from '@/components/ui/FeedbackState';
import type { AgeDistribution } from '@/types/platform';
import styles from '../dashboard.module.css';
import './dashboard-chart-setup';

export function AgeOverview({ data }: { data: AgeDistribution[] }) {
  return (
    <section className={styles.surface} aria-labelledby="age-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Distribuição</p>
          <h3 id="age-title" className={styles.sectionTitle}>Faixas etárias</h3>
        </div>
      </div>
      {data.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Distribuição ainda indisponível"
          description="O gráfico será exibido quando houver dados agregados suficientes."
        />
      ) : (
        <div className={styles.ageLayout}>
          <div className={styles.doughnutFrame}>
            <Doughnut
              data={{
                labels: data.map((item) => item.label),
                datasets: [{
                  data: data.map((item) => item.percent),
                  backgroundColor: data.map((item) => item.color),
                  borderWidth: 0,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <ul className={styles.legendList}>
            {data.map((item) => (
              <li key={item.label}>
                <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
                <strong>{item.percent}%</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
