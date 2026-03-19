'use client';

import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './Hero.module.css';

interface HeroProps {
  onQuizOpen: () => void;
}

export default function Hero({ onQuizOpen }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <RevealOnScroll delay={0}>
          <div className={styles.content}>
            {/* Eyebrow */}
            <span className={styles.eyebrow}>
              <span className={styles.pulseDot} />
              Saúde feminina corporativa — reimaginada
            </span>

            {/* Headline */}
            <h1 className={styles.headline}>
              O <em>Duolingo</em> da Saúde Feminina{' '}
              <span className={styles.gold}>no Trabalho</span>
            </h1>

            {/* Subtitle */}
            <p className={styles.subtitle}>
              Plataforma gamificada que transforma o cuidado com a saúde da
              mulher em hábitos diários — reduzindo absenteísmo, aumentando
              engajamento e gerando ROI mensurável para sua empresa.
            </p>

            {/* CTAs */}
            <div className={styles.ctas}>
              <a className={styles.btnPrimary} href="/welcome">
                Acessar Plataforma →
              </a>
              <button className={styles.btnSecondary} onClick={onQuizOpen}>
                Descobrir meu perfil de saúde
              </button>
            </div>
          </div>
        </RevealOnScroll>

        {/* Avatar Cards */}
        <RevealOnScroll delay={200}>
          <div className={styles.cards}>
            {/* Before card */}
            <div className={styles.avatarCard}>
              <div className={styles.cardLabel}>Antes</div>
              <div className={styles.avatarFrame}>
                <svg
                  className={styles.silhouette}
                  viewBox="0 0 80 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="40" cy="24" r="16" fill="var(--rose-300)" />
                  <path
                    d="M12 90c0-18 12-30 28-30s28 12 28 30"
                    stroke="var(--rose-300)"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
                <svg
                  className={styles.radarOverlay}
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="50,15 78,35 70,70 30,70 22,35"
                    fill="rgba(200,92,126,0.12)"
                    stroke="var(--rose-400)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div className={styles.scoreRow}>
                <span className={styles.scoreLabel}>Score</span>
                <span className={styles.scoreValue}>3.2</span>
              </div>
            </div>

            {/* After card */}
            <div className={`${styles.avatarCard} ${styles.afterCard}`}>
              <span className={styles.afterPill}>90 dias com UniHER</span>
              <div className={styles.cardLabel}>Depois</div>
              <div className={styles.avatarFrame}>
                <svg
                  className={styles.silhouette}
                  viewBox="0 0 80 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="40" cy="24" r="16" fill="var(--rose-500)" />
                  <path
                    d="M12 90c0-18 12-30 28-30s28 12 28 30"
                    stroke="var(--rose-500)"
                    strokeWidth="3"
                    fill="none"
                  />
                </svg>
                <svg
                  className={styles.radarOverlay}
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon
                    points="50,8 85,30 80,75 20,75 15,30"
                    fill="rgba(200,92,126,0.18)"
                    stroke="var(--rose-500)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div className={styles.scoreRow}>
                <span className={styles.scoreLabel}>Score</span>
                <span className={`${styles.scoreValue} ${styles.scoreHigh}`}>
                  8.4
                </span>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Trust Strip */}
        <RevealOnScroll delay={400}>
          <div className={styles.trustStrip}>
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>4.8x</span>
              <span className={styles.trustLabel}>ROI</span>
            </div>
            <div className={styles.trustDivider} />
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>R$287k</span>
              <span className={styles.trustLabel}>Economia</span>
            </div>
            <div className={styles.trustDivider} />
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>-23%</span>
              <span className={styles.trustLabel}>Absenteísmo</span>
            </div>
            <div className={styles.trustDivider} />
            <div className={styles.trustItem}>
              <span className={styles.trustValue}>92%</span>
              <span className={styles.trustLabel}>Engajamento</span>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
