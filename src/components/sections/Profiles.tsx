import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './Profiles.module.css';

const profiles = [
  {
    id: 'rh',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
        <line x1="11" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5" />
        <line x1="11" y1="19" x2="17" y2="19" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    iconColor: 'var(--rose-50)',
    iconText: 'var(--rose-500)',
    title: 'RH',
    description:
      'Centralize campanhas, monitore indicadores e comprove ROI de saúde feminina com dados reais.',
    features: [
      'Dashboard com ROI em tempo real',
      'Relatórios automáticos de engajamento',
      'Campanhas segmentadas por perfil',
      'Alertas de risco e absenteísmo',
      'Integração com sistemas de RH',
    ],
  },
  {
    id: 'lideranca',
    featured: true,
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6 28c0-6 4-10 10-10s10 4 10 10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M16 3l1.5 3 3.5.5-2.5 2.5.5 3.5L16 11l-3 1.5.5-3.5L11 6.5l3.5-.5z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    ),
    iconColor: 'var(--gold-50)',
    iconText: 'var(--gold-700)',
    title: 'Liderança',
    description:
      'Visibilidade estratégica sobre bem-estar do time feminino e impacto direto na performance.',
    features: [
      'Visão consolidada de bem-estar',
      'Métricas de produtividade e retenção',
      'Benchmarks de mercado integrados',
      'Projeções de economia e ROI',
    ],
  },
  {
    id: 'colaboradora',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6 28c0-6 4-10 10-10s10 4 10 10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M13 17l2.5 2.5L21 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    iconColor: 'var(--cream-100)',
    iconText: 'var(--green-600)',
    title: 'Colaboradora',
    description:
      'Jornada personalizada com missões diárias, gamificação e acompanhamento contínuo da sua saúde.',
    features: [
      'Quiz de perfil + plano personalizado',
      'Missões diárias com streaks',
      'Badges, níveis e conquistas',
      'Radar de saúde atualizado',
      'Conteúdo curado por especialistas',
    ],
  },
];

export default function Profiles() {
  return (
    <section className={styles.section} id="profiles">
      <div className={styles.container}>
        <RevealOnScroll>
          <div className={styles.header}>
            <span className="section-eyebrow">Personas</span>
            <h2 className="section-title">Para quem é o UniHER</h2>
            <p className="section-sub">
              Cada perfil tem uma experiência única dentro da plataforma —
              conectando RH, liderança e colaboradoras em um mesmo ecossistema.
            </p>
          </div>
        </RevealOnScroll>

        <div className={styles.grid}>
          {profiles.map((p, i) => (
            <RevealOnScroll key={p.id} delay={i * 120}>
              <div
                className={`${styles.card} ${p.featured ? styles.featured : ''}`}
              >
                <div
                  className={styles.profileIcon}
                  style={{
                    background: p.iconColor,
                    color: p.iconText,
                  }}
                >
                  {p.icon}
                </div>

                <h3 className={styles.cardTitle}>{p.title}</h3>
                <p className={styles.cardDesc}>{p.description}</p>

                <ul className={styles.featureList}>
                  {p.features.map((f, i) => (
                    <li key={i} className={styles.featureItem}>
                      <span className={styles.featureDot} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
