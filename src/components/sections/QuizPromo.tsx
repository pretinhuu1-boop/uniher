'use client';

import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './QuizPromo.module.css';

interface QuizPromoProps {
  onQuizOpen: () => void;
}

const TAGS = [
  '2 minutos',
  'Resultado imediato',
  '4 arquetipos',
  'Radar de saude',
  'Plano 30/60/90 dias',
];

export default function QuizPromo({ onQuizOpen }: QuizPromoProps) {
  return (
    <section className={styles.section} id="diagnostico">
      <div className={styles.container}>
        <RevealOnScroll>
          <span className={styles.eyebrow}>Diagnóstico gratuito</span>
          <h2 className={styles.title}>Descubra seu Perfil de Saúde agora</h2>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className={styles.promoCard}>
            <div className={styles.circleOverlay} aria-hidden="true" />

            <h3 className={styles.promoTitle}>
              Pronta para <em className={styles.italic}>evoluir</em>?
            </h3>
            <p className={styles.promoSub}>
              Responda algumas perguntas e descubra seu arquétipo de saúde.
              Receba um plano personalizado com metas de 30, 60 e 90 dias,
              radar de bem-estar e missões diárias.
            </p>

            <button className={styles.cta} onClick={onQuizOpen}>
              Comecar diagnostico gratuito &rarr;
            </button>

            <div className={styles.tags}>
              {TAGS.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
