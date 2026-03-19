'use client';

import { useRouter } from 'next/navigation';
import styles from './welcome-colaboradora.module.css';

export default function WelcomeColaboradoraPage() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      {/* Back link */}
      <button
        type="button"
        className={styles.backLink}
        onClick={() => router.push('/welcome')}
        aria-label="Voltar para seleção de perfil"
      >
        <span className={styles.backArrow}>&#8592;</span>
        Voltar
      </button>

      <div className={styles.content}>
        {/* Person silhouette icon */}
        <div className={styles.iconWrapper}>
          <svg
            className={styles.personIcon}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="7" r="4" fill="currentColor" opacity="0.25" />
            <path
              d="M12 13c-4.42 0-8 1.79-8 4v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.21-3.58-4-8-4Z"
              fill="currentColor"
              opacity="0.25"
            />
            <circle
              cx="12"
              cy="7"
              r="4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M12 13c-4.42 0-8 1.79-8 4v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1c0-2.21-3.58-4-8-4Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className={styles.title}>Bem-vinda, Colaboradora!</h1>
        <p className={styles.subtitle}>
          Você já tem uma conta ou deseja fazer seu primeiro check-in de saúde?
        </p>

        {/* Option cards */}
        <div className={styles.optionCards}>
          {/* Card 1 — Check-in */}
          <button
            type="button"
            className={`${styles.optionCard} ${styles.optionCardCheckin}`}
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('uniher-role', 'colaboradora');
              }
              router.push('/colaboradora');
            }}
            aria-label="Iniciar Check-in de Saúde"
          >
            <div className={`${styles.optionIcon} ${styles.optionIconCheckin}`}>
              <span role="img" aria-hidden="true">&#10024;</span>
            </div>
            <div className={styles.optionText}>
              <h2 className={styles.optionTitle}>Iniciar Check-in de Saúde</h2>
              <p className={styles.optionDescription}>
                Primeira vez? Complete seu perfil e receba recomendações personalizadas.
              </p>
            </div>
            <div className={`${styles.optionArrow} ${styles.optionArrowCheckin}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Card 2 — Login */}
          <button
            type="button"
            className={`${styles.optionCard} ${styles.optionCardLogin}`}
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('uniher-role', 'colaboradora');
              }
              router.push('/auth');
            }}
            aria-label="Já tenho uma conta"
          >
            <div className={`${styles.optionIcon} ${styles.optionIconLogin}`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10h12M12 6l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className={styles.optionText}>
              <h2 className={styles.optionTitle}>Já tenho uma conta</h2>
              <p className={styles.optionDescription}>
                Entre com seu email e senha para acessar sua área.
              </p>
            </div>
            <div className={`${styles.optionArrow} ${styles.optionArrowLogin}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M6 3L11 8L6 13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Feature icons strip */}
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <span role="img" aria-label="Prevenção">&#129658;</span>
            </div>
            <span className={styles.featureLabel}>Prevenção</span>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <span role="img" aria-label="Monitoramento">&#128202;</span>
            </div>
            <span className={styles.featureLabel}>Monitoramento</span>
          </div>
          <div className={styles.featureItem}>
            <div className={styles.featureIcon}>
              <span role="img" aria-label="Personalizado">&#127919;</span>
            </div>
            <span className={styles.featureLabel}>Personalizado</span>
          </div>
        </div>
      </div>
    </main>
  );
}
