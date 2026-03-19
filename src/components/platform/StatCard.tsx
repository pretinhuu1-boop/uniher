import { DashboardKPI } from '@/types/platform';
import styles from './StatCard.module.css';

interface StatCardProps {
  kpi: DashboardKPI;
}

export default function StatCard({ kpi }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.icon} style={{ background: `${kpi.color}15`, color: kpi.color }}>
          {kpi.icon === 'users' && '👥'}
          {kpi.icon === 'trending-up' && '📈'}
          {kpi.icon === 'heart' && '💗'}
          {kpi.icon === 'activity' && '📋'}
        </div>
        {kpi.trend && (
          <span className={`${styles.trend} ${kpi.trendDirection === 'up' ? styles.trendUp : styles.trendDown}`}>
            {kpi.trend}
          </span>
        )}
      </div>
      <span className={styles.value}>{kpi.value}</span>
      <span className={styles.label}>{kpi.label}</span>
      {kpi.subtitle && <span className={styles.subtitle}>{kpi.subtitle}</span>}
    </div>
  );
}
