'use client';

import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './ROI.module.css';

interface ROIProps {
  onQuizOpen: () => void;
}

const METRICS = [
  { value: '4.8x', label: 'ROI atual' },
  { value: 'R$287k', label: 'Economia estimada' },
  { value: '-23%', label: 'Absenteísmo' },
  { value: '-35%', label: 'Risco alto população' },
];

export default function ROI({ onQuizOpen }: ROIProps) {
  return (
    <section className={styles.section} id="roi">
      <div className={styles.container}>
        <RevealOnScroll>
          <span className={styles.eyebrow}>Para o RH</span>
          <h2 className={styles.title}>ROI mensurável em tempo real</h2>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className={styles.banner}>
            <div className={styles.circleOverlay} aria-hidden="true" />

            <span className={styles.bannerEyebrow}>
              Projeção baseada em absenteísmo e sinistralidade
            </span>
            <h3 className={styles.bannerTitle}>
              Cada real investido gera retorno comprovado
            </h3>

            <div className={styles.metricsRow}>
              {METRICS.map((m, i) => (
                <div key={m.label} className={styles.metricGroup}>
                  {i > 0 && <div className={styles.divider} />}
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>{m.value}</span>
                    <span className={styles.metricLabel}>{m.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <p className={styles.bannerSub}>
              Dados calculados com base em colaboradoras ativas na plataforma nos
              últimos 12 meses, considerando redução média de absenteísmo e
              sinistralidade.
            </p>

            <button className={styles.cta} onClick={onQuizOpen}>
              Ver meu potencial de economia &rarr;
            </button>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
