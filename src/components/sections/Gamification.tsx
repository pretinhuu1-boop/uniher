import RevealOnScroll from '@/components/ui/RevealOnScroll';
import styles from './Gamification.module.css';

const rankingData = [
  { dept: 'Operações', pts: 24320, pct: 100, position: 1 },
  { dept: 'TI', pts: 21840, pct: 90, position: 2 },
  { dept: 'Marketing', pts: 19450, pct: 80, position: 3 },
  { dept: 'Comercial', pts: 12230, pct: 50, position: 4 },
];

const badges = [
  { emoji: '\u{1F525}', label: '7 dias' },
  { emoji: '\u{1F31F}', label: 'Quiz pro' },
  { emoji: '\u{1F3AF}', label: 'Meta 30d' },
  { emoji: '\u{1F48E}', label: 'Radar top' },
  { emoji: '\u{1F9E0}', label: 'Mentora' },
];

export default function Gamification() {
  return (
    <section className={styles.section} id="gamification">
      <div className={styles.container}>
        <RevealOnScroll>
          <div className={styles.header}>
            <span className="section-eyebrow">Gamificação</span>
            <h2 className="section-title">
              Saúde que vicia — pelo bem
            </h2>
            <p className="section-sub">
              Streaks, badges, arena entre departamentos e semáforo de saúde
              mantêm suas colaboradoras engajadas todos os dias.
            </p>
          </div>
        </RevealOnScroll>

        <div className={styles.grid}>
          {/* ── Arena (wide card) ── */}
          <RevealOnScroll>
            <div className={`${styles.card} ${styles.wide}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l3 6 6 1-4.5 4 1.5 6-6-3.5L6 19l1.5-6L3 9l6-1z" fill="currentColor" />
                  </svg>
                </span>
                <div>
                  <h3 className={styles.cardTitle}>Arena por Departamento</h3>
                  <p className={styles.cardSub}>Competição saudável entre times</p>
                </div>
              </div>

              {/* Total points */}
              <div className={styles.totalPoints}>
                <span className={styles.totalValue}>87.840</span>
                <span className={styles.totalLabel}>pontos totais</span>
                <span className={styles.levelBadge}>Nv.9</span>
              </div>

              {/* Podium */}
              <div className={styles.podium}>
                <div className={`${styles.podiumPlace} ${styles.second}`}>
                  <div className={styles.podiumAvatar}>TI</div>
                  <div className={styles.podiumBar}>
                    <span className={styles.podiumPos}>2</span>
                  </div>
                </div>
                <div className={`${styles.podiumPlace} ${styles.first}`}>
                  <span className={styles.crown}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                      <path d="M2 18l3-10 5 5 2-9 2 9 5-5 3 10z" fill="var(--gold-500)" stroke="var(--gold-700)" strokeWidth="1" />
                    </svg>
                  </span>
                  <div className={styles.podiumAvatar}>OP</div>
                  <div className={styles.podiumBar}>
                    <span className={styles.podiumPos}>1</span>
                  </div>
                </div>
                <div className={`${styles.podiumPlace} ${styles.third}`}>
                  <div className={styles.podiumAvatar}>MK</div>
                  <div className={styles.podiumBar}>
                    <span className={styles.podiumPos}>3</span>
                  </div>
                </div>
              </div>

              {/* Ranking list */}
              <div className={styles.rankingList}>
                {rankingData.map((r) => (
                  <div key={r.dept} className={styles.rankingRow}>
                    <span className={styles.rankPos}>{r.position}</span>
                    <span className={styles.rankDept}>{r.dept}</span>
                    <div className={styles.rankBarWrap}>
                      <div
                        className={styles.rankBar}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                    <span className={styles.rankPts}>
                      {r.pts.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* ── Streak card ── */}
          <RevealOnScroll>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2c-1 6-5 8-5 13a6 6 0 0012 0c0-5-4-7-5-13z" fill="currentColor" />
                  </svg>
                </span>
                <h3 className={styles.cardTitle}>Streak de Saúde</h3>
              </div>

              <div className={styles.streakValue}>
                <span className={styles.streakNumber}>12</span>
                <span className={styles.streakUnit}>dias seguidos</span>
              </div>

              <div className={styles.levelSection}>
                <div className={styles.levelHeader}>
                  <span className={styles.levelLabel}>Level 5</span>
                  <span className={styles.levelXp}>2.370 / 2.500</span>
                </div>
                <div className={styles.levelBarWrap}>
                  <div className={styles.levelBar} style={{ width: '94.8%' }} />
                </div>
              </div>
            </div>
          </RevealOnScroll>

          {/* ── Badges card ── */}
          <RevealOnScroll>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2l2.5 5 5.5.8-4 3.9 1 5.3-5-2.6-5 2.6 1-5.3-4-3.9 5.5-.8z" fill="currentColor" />
                  </svg>
                </span>
                <h3 className={styles.cardTitle}>Badges &amp; Conquistas</h3>
              </div>

              <div className={styles.badgeGrid}>
                {badges.map((b) => (
                  <div key={b.label} className={styles.badgeSquare}>
                    <span className={styles.badgeEmoji}>{b.emoji}</span>
                    <span className={styles.badgeLabel}>{b.label}</span>
                  </div>
                ))}
                <div className={`${styles.badgeSquare} ${styles.badgeMore}`}>
                  <span className={styles.badgeEmoji}>+5</span>
                </div>
              </div>

              <p className={styles.badgeCount}>
                2 desbloqueados &middot; 7 disponíveis
              </p>
            </div>
          </RevealOnScroll>

          {/* ── Semaforo card ── */}
          <RevealOnScroll>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="7" y="2" width="10" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="7" r="2.5" fill="#E74C3C" />
                    <circle cx="12" cy="12" r="2.5" fill="#F1C40F" />
                    <circle cx="12" cy="17" r="2.5" fill="#2ECC71" />
                  </svg>
                </span>
                <h3 className={styles.cardTitle}>Semáforo de Saúde</h3>
              </div>

              <div className={styles.alertList}>
                <div className={`${styles.alertRow} ${styles.alertRed}`}>
                  <span className={styles.alertDot} />
                  <span className={styles.alertText}>1 exame urgente</span>
                </div>
                <div className={`${styles.alertRow} ${styles.alertYellow}`}>
                  <span className={styles.alertDot} />
                  <span className={styles.alertText}>2 itens de atenção</span>
                </div>
                <div className={`${styles.alertRow} ${styles.alertGreen}`}>
                  <span className={styles.alertDot} />
                  <span className={styles.alertText}>3 itens em dia</span>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
