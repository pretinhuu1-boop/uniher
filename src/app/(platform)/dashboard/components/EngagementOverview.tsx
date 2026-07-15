import { Line } from 'react-chartjs-2';

import { FeedbackState } from '@/components/ui/FeedbackState';
import type { EngagementDataPoint } from '@/types/platform';
import styles from '../dashboard.module.css';
import './dashboard-chart-setup';

export function EngagementOverview({ data }: { data: EngagementDataPoint[] }) {
  return (
    <section className={styles.surface} aria-labelledby="engagement-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Participação</p>
          <h2 id="engagement-title" className={styles.sectionTitle}>Engajamento ao longo do tempo</h2>
          <p className={styles.sectionDescription}>Atividade e retenção consolidadas por período.</p>
        </div>
        <span className={styles.stateLabel}>Indicador agregado</span>
      </div>
      {data.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="A evolução aparecerá aqui"
          description="Os pontos serão consolidados quando houver atividade suficiente no período."
        />
      ) : (
        <div className={styles.chartFrame}>
          <Line
            data={{
              labels: data.map((point) => point.month),
              datasets: [
                {
                  label: 'Engajamento %',
                  data: data.map((point) => point.engagement),
                  borderColor: '#8b622d',
                  backgroundColor: 'rgba(185, 134, 67, 0.12)',
                  fill: true,
                  tension: 0.35,
                },
                {
                  label: 'Retenção %',
                  data: data.map((point) => point.retention),
                  borderColor: '#536444',
                  backgroundColor: 'rgba(83, 100, 68, 0.08)',
                  fill: false,
                  tension: 0.35,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { min: 0, max: 100 } },
            }}
          />
        </div>
      )}
    </section>
  );
}
