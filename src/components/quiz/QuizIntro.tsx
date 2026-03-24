'use client';
import Image from 'next/image';
import styles from './QuizIntro.module.css';

interface QuizIntroProps {
  onStart: () => void;
}

export default function QuizIntro({ onStart }: QuizIntroProps) {
  return (
    <div className={styles.intro}>
      {/* Logo */}
      <div className={styles.logo}>
        <Image src="/logo-uniher.png" alt="" width={32} height={26} className="object-contain" style={{ width: 32, height: 'auto' }} />
        <span className={styles.logoText}>UniHER</span>
      </div>

      {/* Title */}
      <h2 className={styles.title}>
        Descubra seu Perfil <em>de Saúde</em>
      </h2>

      {/* Description */}
      <p className={styles.description}>
        Responda 6 perguntas rápidas e receba um diagnóstico personalizado com
        IA — descubra seu arquétipo de saúde e veja como o UniHER pode
        transformar seu bem-estar em 90 dias.
      </p>

      {/* Before / After mini cards */}
      <div className={styles.comparison}>
        <div className={styles.miniCard}>
          <span className={styles.miniLabel}>Hoje</span>
          <div className={styles.miniAvatar}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="18" r="8" fill="#C4AEBA" opacity="0.5" />
              <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill="#C4AEBA" opacity="0.3" />
            </svg>
          </div>
          <div className={styles.miniScore}>
            <span className={styles.miniScoreLabel}>Score</span>
            <span className={styles.miniScoreValue}>3.2</span>
          </div>
        </div>

        <div className={styles.miniArrow}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#C9A264" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className={`${styles.miniCard} ${styles.miniCardAfter}`}>
          <span className={styles.miniPill}>Com UniHER</span>
          <span className={styles.miniLabel}>90 dias</span>
          <div className={styles.miniAvatar}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="18" r="8" fill="#C9A264" opacity="0.6" />
              <path d="M10 42c0-8 6-14 14-14s14 6 14 14" fill="#C9A264" opacity="0.3" />
            </svg>
          </div>
          <div className={styles.miniScore}>
            <span className={styles.miniScoreLabel}>Score</span>
            <span className={`${styles.miniScoreValue} ${styles.scoreHigh}`}>8.4</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button className={styles.cta} onClick={onStart}>
        Começar meu diagnóstico
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Tags */}
      <div className={styles.tags}>
        <span className={styles.tag}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#C9A264" strokeWidth="1"/>
            <path d="M7 4v3l2 1.5" stroke="#C9A264" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          2 minutos
        </span>
        <span className={styles.tag}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 4" stroke="#C9A264" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Resultado imediato
        </span>
        <span className={styles.tag}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#C9A264" strokeWidth="1"/>
            <path d="M5 7h4M7 5v4" stroke="#C9A264" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          100% gratuito
        </span>
      </div>
    </div>
  );
}
