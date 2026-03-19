import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './HowItWorks.module.css';

const steps = [
  {
    number: 1,
    tag: 'RH · Onboarding',
    title: 'Empresa se cadastra em 3 minutos',
    description:
      'O RH registra a empresa, importa colaboradoras e configura campanhas — sem TI, sem integrações complexas.',
    chips: ['CNPJ automático', 'Setor de atuação', 'Plano Trial gratuito'],
  },
  {
    number: 2,
    tag: 'Colaboradora · Diagnóstico',
    title: 'Quiz de perfil + IA cria plano personalizado',
    description:
      'Cada colaboradora responde um quiz e recebe um plano de saúde em 30/60/90 dias baseado no seu arquétipo.',
    chips: ['4 arquétipos', 'Radar de saúde', 'Plano 30/60/90d'],
  },
  {
    number: 3,
    tag: 'Colaboradora · Engajamento',
    title: 'Missões diárias, campanhas e gamificação',
    description:
      'Missões de saúde diárias, streaks, badges e competições entre departamentos mantêm o engajamento alto.',
    chips: ['Streak diário', 'Badges e níveis', 'Arena departamentos'],
  },
  {
    number: 4,
    tag: 'RH · Gestão',
    title: 'Dashboard com ROI, relatórios e alertas',
    description:
      'O RH acompanha indicadores em tempo real, recebe alertas e gera relatórios automáticos para a liderança.',
    chips: ['ROI 4.8x', 'Relatório automático', 'Projeção de risco'],
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="howitworks">
      <div className={styles.container}>
        <RevealOnScroll>
          <div className={styles.header}>
            <span className="section-eyebrow">Passo a passo</span>
            <h2 className="section-title">Como o UniHER funciona</h2>
            <p className="section-sub">
              Da implementação ao ROI comprovado em 4 etapas simples.
            </p>
          </div>
        </RevealOnScroll>

        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <RevealOnScroll key={step.number}>
              <div className={styles.step}>
                {/* Number + connector */}
                <div className={styles.stepSide}>
                  <div className={styles.stepNumber}>{step.number}</div>
                  {index < steps.length - 1 && (
                    <div className={styles.connector} />
                  )}
                </div>

                {/* Content */}
                <div className={styles.stepContent}>
                  <span className={styles.stepTag}>{step.tag}</span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.description}</p>
                  <div className={styles.chips}>
                    {step.chips.map((chip) => (
                      <span key={chip} className={styles.chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
