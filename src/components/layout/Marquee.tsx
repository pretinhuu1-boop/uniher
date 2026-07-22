import styles from './Marquee.module.css';

const items = [
  'Saúde Feminina Preventiva',
  'Jornadas de Cuidado',
  'ROI Mensurável',
  'Dashboard RH em Tempo Real',
  'Semáforo de Saúde',
  'Relatórios Automáticos',
  'Indicadores Agregados',
  'Missões Colaborativas',
  'Outubro Rosa · Novembro Azul',
  'IA Personalizada',
];

function MarqueeItems() {
  return (
    <>
      {items.map((item) => (
        <span key={item} className={styles.item}>
          <span className={styles.dot} />
          {item}
        </span>
      ))}
    </>
  );
}

export default function Marquee() {
  return (
    <section className={styles.marquee}>
      <div className={styles.track}>
        <MarqueeItems />
        <MarqueeItems />
      </div>
    </section>
  );
}
