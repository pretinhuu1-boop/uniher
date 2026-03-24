'use client';

import { useRef, useEffect } from 'react';
import { DIMENSIONS } from '@/data/questions';
import RadarChart from './RadarChart';
import styles from './QuizResults.module.css';

interface QuizResultsChartProps {
  base: number[];
  projection: number[];
  beforeAvg: string;
  afterAvg: string;
  selectedDay: number;
}

export default function QuizResultsChart({
  base,
  projection,
  beforeAvg,
  afterAvg,
  selectedDay,
}: QuizResultsChartProps) {
  const dimGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = dimGridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.dimCardVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    grid.querySelectorAll(`.${styles.dimCard}`).forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [selectedDay]);

  return (
    <>
      {/* Before / After Score Boxes */}
      <div className={styles.scoreBoxes}>
        <div className={styles.scoreBox}>
          <span className={styles.scoreBoxLabel}>Você hoje</span>
          <span className={`${styles.scoreBoxValue} ${styles.scoreBoxBefore}`}>{beforeAvg}</span>
        </div>
        <div className={styles.scoreBoxArrow}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M12 6l4 4-4 4" stroke="var(--rose-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreBoxLabel}>Com UniHER</span>
          <span className={`${styles.scoreBoxValue} ${styles.scoreBoxAfter}`}>{afterAvg}</span>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRose}`} />
          <span className={styles.legendLabel}>Você hoje</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotGold}`} />
          <span className={styles.legendLabel}>Com UniHER</span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className={styles.chartWrap} role="img" aria-label={`Gráfico radar comparando suas dimensões de saúde antes e depois do UniHER em ${selectedDay} dias`}>
        <RadarChart before={base} after={projection} />
      </div>

      {/* Dimension Cards */}
      <div className={styles.dimGrid} ref={dimGridRef}>
        {DIMENSIONS.map((dim, i) => {
          const before = base[i];
          const after = projection[i];
          const improvement = after - before;
          const pct = (after / 10) * 100;

          return (
            <div key={dim} className={styles.dimCard}>
              <div className={styles.dimHeader}>
                <span className={styles.dimName}>{dim}</span>
                <span className={styles.dimImprovement}>+{improvement.toFixed(1)}</span>
              </div>
              <div className={styles.dimScores}>
                <span className={styles.dimBefore}>{before.toFixed(1)}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 6h6M6 3.5l3 2.5-3 2.5" stroke="var(--text-400)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.dimAfter}>{after.toFixed(1)}</span>
              </div>
              <div className={styles.dimBarTrack}>
                <div className={styles.dimBarFill} style={{ '--bar-width': `${pct}%` } as React.CSSProperties} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
