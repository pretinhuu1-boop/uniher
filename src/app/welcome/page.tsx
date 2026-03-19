'use client';

import { useRouter } from 'next/navigation';
import styles from './welcome.module.css';

interface RoleCard {
  key: 'rh' | 'lideranca' | 'colaboradora';
  title: string;
  description: string;
  bullets: string[];
  icon: string;
  href: string;
}

const roles: RoleCard[] = [
  {
    key: 'rh',
    title: 'RH',
    description: 'Gerencie a saúde e bem-estar das colaboradoras da empresa',
    bullets: ['Dashboard completo', 'Gestão de colaboradoras', 'Relatórios de engajamento'],
    icon: '\u{1F4CB}',
    href: '/hr-onboarding',
  },
  {
    key: 'lideranca',
    title: 'Liderança',
    description: 'Acompanhe sua equipe e cuide da sua própria saúde',
    bullets: ['Visão da equipe', 'Sua jornada pessoal', 'Engajamento do time'],
    icon: '\u{1F465}',
    href: '/dashboard',
  },
  {
    key: 'colaboradora',
    title: 'Colaboradora',
    description: 'Cuide da sua saúde com acompanhamento personalizado',
    bullets: ['Check-in de saúde', 'Campanhas e desafios', 'Recompensas exclusivas'],
    icon: '\u{1F464}',
    href: '/welcome-colaboradora',
  },
];

const cardStyles = {
  rh: {
    card: styles.cardRH,
    icon: styles.cardIconRH,
    dot: styles.bulletDotRH,
    arrow: styles.cardArrowRH,
  },
  lideranca: {
    card: styles.cardLideranca,
    icon: styles.cardIconLideranca,
    dot: styles.bulletDotLideranca,
    arrow: styles.cardArrowLideranca,
  },
  colaboradora: {
    card: styles.cardColaboradora,
    icon: styles.cardIconColaboradora,
    dot: styles.bulletDotColaboradora,
    arrow: styles.cardArrowColaboradora,
  },
};

export default function WelcomePage() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      {/* Logo */}
      <div className={styles.logo}>
        <svg width="64" height="64" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z"
            fill="#F9EEF3"
            stroke="#C85C7E"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z"
            fill="#EAB8CB"
            stroke="#C85C7E"
            strokeWidth="0.9"
          />
          <circle cx="18" cy="6" r="1.5" fill="#B8922A" />
        </svg>
      </div>

      {/* Header */}
      <h1 className={styles.title}>UniHER</h1>
      <p className={styles.subtitle}>Como você vai usar o app?</p>

      {/* Role Cards */}
      <div className={styles.cards}>
        {roles.map((role) => {
          const variant = cardStyles[role.key];
          return (
            <button
              key={role.key}
              className={`${styles.card} ${variant.card}`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('uniher-role', role.key);
                }
                router.push(role.href);
              }}
              type="button"
              aria-label={`Entrar como ${role.title}`}
            >
              <div className={`${styles.cardIcon} ${variant.icon}`}>
                <span role="img" aria-hidden="true">{role.icon}</span>
              </div>

              <h2 className={styles.cardTitle}>{role.title}</h2>
              <p className={styles.cardDescription}>{role.description}</p>

              <ul className={styles.cardBullets}>
                {role.bullets.map((bullet) => (
                  <li key={bullet} className={styles.bullet}>
                    <span className={`${styles.bulletDot} ${variant.dot}`} />
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className={`${styles.cardArrow} ${variant.arrow}`}>
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
          );
        })}
      </div>

      {/* Footer */}
      <p className={styles.footer}>
        Ao continuar, você concorda com nossa{' '}
        <a href="/privacidade" className={styles.footerLink}>
          política de privacidade
        </a>{' '}
        e{' '}
        <a href="/termos" className={styles.footerLink}>
          termos de uso
        </a>
        .
      </p>
    </main>
  );
}
