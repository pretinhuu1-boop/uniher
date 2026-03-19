'use client';

import { useState, useEffect } from 'react';
import { SEMAFORO } from '@/data/mock-collaborator';
import styles from './semaforo.module.css';

/* ── Mock detail data per dimension ── */
const DETAIL_DATA: Record<string, { history: string[]; tips: string[] }> = {
  'Prevenção': {
    history: ['Sem 1: 2.8', 'Sem 2: 3.0', 'Sem 3: 3.1', 'Sem 4: 3.2'],
    tips: [
      'Agende mamografia anual',
      'Consulte ginecologista a cada 6 meses',
      'Mantenha seus exames de sangue em dia',
    ],
  },
  'Sono': {
    history: ['Sem 1: 5.0', 'Sem 2: 5.3', 'Sem 3: 5.6', 'Sem 4: 5.8'],
    tips: [
      'Evite telas 1h antes de dormir',
      'Mantenha horário regular de sono',
    ],
  },
  'Energia': {
    history: ['Sem 1: 4.8', 'Sem 2: 5.0', 'Sem 3: 5.2', 'Sem 4: 5.5'],
    tips: [
      'Faça pausas de 5 min a cada 2h de trabalho',
      'Hidrate-se com pelo menos 2L de água por dia',
      'Pratique alongamento entre reuniões',
    ],
  },
  'Saúde Mental': {
    history: ['Sem 1: 6.5', 'Sem 2: 6.8', 'Sem 3: 7.0', 'Sem 4: 7.2'],
    tips: [
      'Continue com práticas de mindfulness',
      'Reserve 10 min diários para respiração guiada',
    ],
  },
  'Hábitos': {
    history: ['Sem 1: 6.0', 'Sem 2: 6.3', 'Sem 3: 6.5', 'Sem 4: 6.8'],
    tips: [
      'Mantenha a hidratação ao longo do dia',
      'Inclua frutas e verduras em todas as refeições',
      'Caminhe pelo menos 30 min por dia',
    ],
  },
  'Engajamento': {
    history: ['Sem 1: 7.4', 'Sem 2: 7.8', 'Sem 3: 8.0', 'Sem 4: 8.1'],
    tips: [
      'Continue participando dos desafios semanais',
      'Convide colegas para participar da plataforma',
    ],
  },
};

type FilterType = 'all' | 'red' | 'yellow' | 'green';

function getStatusClass(status: string) {
  if (status === 'green') return styles.green;
  if (status === 'yellow') return styles.yellow;
  return styles.red;
}

function getBorderClass(status: string) {
  if (status === 'green') return styles.borderGreen;
  if (status === 'yellow') return styles.borderYellow;
  return styles.borderRed;
}

export default function SemaforoPage() {
  const greenCount = SEMAFORO.filter(s => s.status === 'green').length;
  const yellowCount = SEMAFORO.filter(s => s.status === 'yellow').length;
  const redCount = SEMAFORO.filter(s => s.status === 'red').length;

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);

  // Score animation on mount
  useEffect(() => {
    // Start all at 0
    const initial: Record<string, number> = {};
    SEMAFORO.forEach(item => { initial[item.dimension] = 0; });
    setAnimatedScores(initial);

    // Animate in steps
    const steps = 20;
    const duration = 800; // ms
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const next: Record<string, number> = {};
      SEMAFORO.forEach(item => {
        next[item.dimension] = parseFloat((item.score * eased).toFixed(1));
      });
      setAnimatedScores(next);
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const handleCardClick = (dimension: string) => {
    setExpandedCard(prev => (prev === dimension ? null : dimension));
  };

  const handleScheduleReminder = (dimension: string) => {
    setReminderFeedback(dimension);
    setTimeout(() => setReminderFeedback(null), 2000);
  };

  const filteredItems = SEMAFORO.filter(item => {
    if (activeFilter === 'all') return true;
    return item.status === activeFilter;
  });

  const filters: { label: string; value: FilterType; count?: number }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Urgente', value: 'red', count: redCount },
    { label: 'Atenção', value: 'yellow', count: yellowCount },
    { label: 'Saudável', value: 'green', count: greenCount },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Semaforo de Saude</h1>
      <p className={styles.subtitle}>
        Visao geral do status de saude das suas colaboradoras
      </p>

      <div className={styles.summary}>
        <span className={`${styles.summaryChip} ${styles.green}`}>
          <span className={`${styles.dot} ${styles.green}`} />
          {greenCount} dimensoes saudaveis
        </span>
        <span className={`${styles.summaryChip} ${styles.yellow}`}>
          <span className={`${styles.dot} ${styles.yellow}`} />
          {yellowCount} precisam de atencao
        </span>
        <span className={`${styles.summaryChip} ${styles.red}`}>
          <span className={`${styles.dot} ${styles.red}`} />
          {redCount} urgentes
        </span>
      </div>

      {/* Filter Chips */}
      <div className={styles.filterBar}>
        {filters.map(f => (
          <button
            key={f.value}
            className={`${styles.filterChip} ${activeFilter === f.value ? styles.filterActive : ''} ${f.value !== 'all' ? styles[`filter_${f.value}`] : ''}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={styles.filterCount}>{f.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {filteredItems.map((item) => {
          const isExpanded = expandedCard === item.dimension;
          const detail = DETAIL_DATA[item.dimension];
          const displayScore = animatedScores[item.dimension] ?? 0;

          return (
            <div
              key={item.dimension}
              className={`${styles.card} ${getBorderClass(item.status)} ${isExpanded ? styles.cardExpanded : ''}`}
              onClick={() => handleCardClick(item.dimension)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardLeft}>
                  <div className={styles.cardIcon}>{item.icon}</div>
                  <span className={styles.dimension}>{item.dimension}</span>
                </div>
                <div className={styles.scoreArea}>
                  <span className={`${styles.statusDot} ${getStatusClass(item.status)}`} />
                  <span className={styles.score}>
                    {displayScore.toFixed(1)}
                    <span className={styles.scoreSuffix}>/10</span>
                  </span>
                  <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                    ▾
                  </span>
                </div>
              </div>
              <p className={styles.recommendation}>{item.recommendation}</p>

              {isExpanded && detail && (
                <div
                  className={styles.detailPanel}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Histórico */}
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailTitle}>📊 Histórico</h4>
                    <div className={styles.historyTrack}>
                      {detail.history.map((entry, i) => (
                        <span key={i} className={styles.historyStep}>
                          {entry}
                          {i < detail.history.length - 1 && (
                            <span className={styles.historyArrow}>→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dicas */}
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailTitle}>💡 Dicas personalizadas</h4>
                    <ul className={styles.tipsList}>
                      {detail.tips.map((tip, i) => (
                        <li key={i} className={styles.tipItem}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Agendar lembrete */}
                  <div className={styles.detailActions}>
                    {reminderFeedback === item.dimension ? (
                      <span className={styles.reminderSuccess}>✓ Lembrete agendado!</span>
                    ) : (
                      <button
                        className={styles.reminderBtn}
                        onClick={() => handleScheduleReminder(item.dimension)}
                      >
                        🔔 Agendar lembrete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
