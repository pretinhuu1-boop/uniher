import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './Pillars.module.css';

interface Pillar {
  number: string;
  numberColor: 'rose' | 'gold' | 'green';
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
}

const PILLARS: Pillar[] = [
  {
    number: '66d',
    numberColor: 'rose',
    title: 'Neuroplasticidade Temporal',
    description:
      'Estudo da University College London comprova que novos hábitos levam em média 66 dias para se consolidarem. Nossa plataforma estrutura ciclos progressivos baseados nessa janela neural.',
    tags: ['Repetição Espaçada', 'Feedback Instantâneo'],
  },
  {
    number: '3x',
    numberColor: 'gold',
    title: 'Loop de Dopamina Controlada',
    description:
      'Pesquisa de Stanford demonstra que recompensas variáveis aumentam em 3x o engajamento sustentado. Calibramos cada micro-recompensa para manter a motivação intrínseca ativa.',
    tags: ['Recompensas Calibradas', 'Motivação Intrínseca'],
    featured: true,
  },
  {
    number: '64%',
    numberColor: 'green',
    title: 'Intenções de Implementação',
    description:
      'Meta-análise com 94 estudos mostra que intenções de implementação (if-then planning) aumentam em 64% a probabilidade de atingir objetivos de saúde.',
    tags: ['Habit Stacking', 'Gatilhos If-Then'],
  },
];

export default function Pillars() {
  return (
    <section className={styles.section} id="ciencia">
      <div className={styles.container}>
        <RevealOnScroll>
          <span className={styles.eyebrow}>Base científica</span>
          <h2 className={styles.title}>
            Construído sobre 3 Pilares Científicos
          </h2>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className={styles.grid}>
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className={`${styles.card} ${pillar.featured ? styles.featured : ''}`}
              >
                <span className={`${styles.number} ${styles[pillar.numberColor]}`}>
                  {pillar.number}
                </span>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.description}>{pillar.description}</p>
                <div className={styles.tags}>
                  {pillar.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
