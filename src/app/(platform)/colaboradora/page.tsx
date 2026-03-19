'use client';

import { useState, useEffect } from 'react';
import { COLLABORATOR_HOME, BADGES, CHALLENGES, NOTIFICATIONS } from '@/data/mock-collaborator';
import styles from './colaboradora.module.css';

export default function ColaboradoraPage() {
  const data = COLLABORATOR_HOME;
  const unreadNotification = NOTIFICATIONS.find((n) => !n.read && n.type === 'badge');
  const [showToast, setShowToast] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInLabel, setCheckInLabel] = useState('Fazer Check-in');
  const [sharedBadge, setSharedBadge] = useState<string | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    CHALLENGES.forEach((c) => {
      map[c.id] = c.progress;
    });
    return map;
  });
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

  const unlockedBadges = BADGES.filter((b) => b.unlockedAt);
  const lockedBadges = BADGES.filter((b) => !b.unlockedAt);
  const activeChallenges = CHALLENGES.filter((c) => c.status === 'active');

  const totalForLevel = data.points + data.pointsNextLevel;
  const progressPercent = Math.round((data.points / totalForLevel) * 100);

  useEffect(() => {
    const timer = setTimeout(() => setShowToast(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  function handleCheckIn() {
    setCheckedIn(true);
    setCheckInLabel('Feito!');
    setTimeout(() => setCheckInLabel('Check-in feito'), 2000);
  }

  function handleShareBadge(badgeId: string) {
    setSharedBadge(badgeId);
    setTimeout(() => setSharedBadge(null), 2000);
  }

  function handleChallengeIncrement(challengeId: string, total: number) {
    setChallengeProgress((prev) => {
      const current = prev[challengeId] ?? 0;
      if (current >= total) return prev;
      return { ...prev, [challengeId]: current + 1 };
    });
    setChallengeFeedback(challengeId);
    setTimeout(() => setChallengeFeedback(null), 2000);
  }

  const statCards = [
    {
      key: 'exams',
      icon: '\u{1F4C8}',
      value: `${data.examsPercent}%`,
      label: 'Exames em Dia',
      sub: `${Math.round((data.examsPercent / 100) * data.examsTotal)}/${data.examsTotal}`,
      detail: `Voce tem ${data.examsTotal - Math.round((data.examsPercent / 100) * data.examsTotal)} exame(s) pendente(s). Acesse o semaforo para ver quais estao atrasados e agendar.`,
    },
    {
      key: 'content',
      icon: '\u{1F4D6}',
      value: `${data.contentViewed}`,
      label: 'Conteudos Vistos',
      sub: 'Este mes',
      detail: `Voce visualizou ${data.contentViewed} conteudo(s) este mes. Explore mais materiais sobre saude e bem-estar na aba de campanhas.`,
    },
    {
      key: 'campaigns',
      icon: '\u{1F4C5}',
      value: `${data.campaignsActive}`,
      label: 'Campanhas',
      sub: `de ${data.campaignsTotal}`,
      detail: `${data.campaignsActive} campanha(s) ativa(s) de ${data.campaignsTotal} disponiveis. Participe para ganhar pontos extras e badges exclusivos!`,
    },
    {
      key: 'streak',
      icon: '\u{1F525}',
      value: `${data.streakDays}`,
      label: 'Dias de Streak',
      sub: '\u00A0',
      detail: `Voce esta numa sequencia de ${data.streakDays} dias! Nao quebre o ritmo — faca seu check-in diario para manter.`,
    },
  ];

  return (
    <div className={styles.page}>
      {/* Greeting Header */}
      <section className={styles.greetingCard}>
        <div className={styles.greetingTop}>
          <div>
            <p className={styles.dateLabel}>
              {'\u{1F324}\uFE0F'} {data.date}
            </p>
            <h1 className={styles.greetingTitle}>
              {data.greeting}, {data.userName} {'\u{1F44B}'}
            </h1>
          </div>
          <button
            className={`${styles.checkInBtn} ${checkedIn ? styles.checkInBtnDone : ''}`}
            onClick={handleCheckIn}
            disabled={checkedIn}
          >
            {checkedIn ? '\u2714' : '\u{1F31F}'} {checkInLabel}
          </button>
        </div>
        <a href="/semaforo" className={styles.healthAlert}>
          <span className={styles.healthAlertIcon}>{'\u{1F6A8}'}</span>
          {data.healthAlert}
          <span className={styles.healthAlertArrow}>&rsaquo;</span>
        </a>
      </section>

      {/* Quick Stats Row */}
      <section className={styles.statsRow}>
        {statCards.map((card) => (
          <div
            key={card.key}
            className={`${styles.statCard} ${expandedStat === card.key ? styles.statCardExpanded : ''}`}
            onClick={() => setExpandedStat(expandedStat === card.key ? null : card.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setExpandedStat(expandedStat === card.key ? null : card.key);
              }
            }}
          >
            <span className={styles.statIcon}>{card.icon}</span>
            <span className={styles.statValue}>{card.value}</span>
            <span className={styles.statLabel}>{card.label}</span>
            <span className={styles.statSub}>{card.sub}</span>
            {expandedStat === card.key && (
              <div className={styles.statDetail}>
                <p className={styles.statDetailText}>{card.detail}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Level Bar */}
      <section className={styles.levelBar}>
        <div className={styles.levelInfo}>
          <span className={styles.levelIcon}>{'\u2B50'}</span>
          <span className={styles.levelText}>Nivel {data.level}</span>
          <span className={styles.levelPoints}>[{data.points.toLocaleString('pt-BR')} pts]</span>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {data.pointsNextLevel} pts para o proximo nivel
          </span>
        </div>

        <div className={styles.levelBadges}>
          {unlockedBadges.slice(0, 3).map((b) => (
            <span key={b.id} className={styles.badgeIcon} title={b.name}>
              {b.icon}
            </span>
          ))}
          <span className={styles.achievementLabel}>
            {'\u{1F3C6}'} {data.achievementCount} conquistas
          </span>
        </div>
      </section>

      {/* Engagement Section */}
      <section className={styles.engagementBanner}>
        <div className={styles.engagementHeader}>
          <div>
            <h2 className={styles.engagementTitle}>Seu Engajamento</h2>
            <p className={styles.engagementSubtitle}>Continue assim!</p>
          </div>
          <a href="/desafios" className={styles.engagementLink}>
            Ver mais &rarr;
          </a>
        </div>

        <div className={styles.engagementMetrics}>
          <div className={styles.metricCircle}>
            <div className={styles.circleOuter}>
              <div>
                <span className={styles.circleValue}>
                  {data.engagementStats.streakDays}
                </span>
                <span className={styles.circleUnit}>dias</span>
              </div>
            </div>
            <span className={styles.metricLabel}>Dias de streak</span>
          </div>

          <div className={styles.metricCircle}>
            <div className={styles.circleOuter}>
              <div>
                <span className={styles.circleValue}>
                  {data.engagementStats.openRate}%
                </span>
                <span className={styles.circleUnit}>abertura</span>
              </div>
            </div>
            <span className={styles.metricLabel}>Taxa de abertura</span>
          </div>

          <div className={styles.metricCircle}>
            <div className={styles.circleOuter}>
              <div>
                <span className={styles.circleValue}>
                  {data.engagementStats.actionsToday}
                </span>
                <span className={styles.circleUnit}>acoes</span>
              </div>
            </div>
            <span className={styles.metricLabel}>Acoes hoje</span>
          </div>
        </div>
      </section>

      {/* Desafios Ativos */}
      <section className={styles.challengesSection}>
        <div className={styles.challengesHeader}>
          <h2 className={styles.challengesTitle}>Desafios Ativos</h2>
          <a href="/desafios" className={styles.challengesLink}>
            Ver todos &rarr;
          </a>
        </div>

        <div className={styles.challengesGrid}>
          {activeChallenges.map((challenge) => {
            const prog = challengeProgress[challenge.id] ?? challenge.progress;
            const pct = Math.round((prog / challenge.total) * 100);
            const isComplete = prog >= challenge.total;
            return (
              <div key={challenge.id} className={styles.challengeCard}>
                <div className={styles.challengeCardTop}>
                  <div>
                    <span className={styles.challengeCategory}>{challenge.category}</span>
                    <h3 className={styles.challengeCardTitle}>{challenge.title}</h3>
                    <p className={styles.challengeCardDesc}>{challenge.description}</p>
                  </div>
                  <span className={styles.challengePoints}>+{challenge.points} pts</span>
                </div>
                <div className={styles.challengeProgressWrap}>
                  <div className={styles.challengeProgressTrack}>
                    <div
                      className={styles.challengeProgressFill}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={styles.challengeProgressInfo}>
                    <span className={styles.challengeProgressLabel}>
                      {prog}/{challenge.total}
                    </span>
                    {challenge.deadline && (
                      <span className={styles.challengeDeadline}>
                        Ate {challenge.deadline.split('-').reverse().join('/')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className={`${styles.challengeIncrementBtn} ${isComplete ? styles.challengeIncrementBtnDone : ''} ${challengeFeedback === challenge.id ? styles.challengeIncrementBtnFeedback : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChallengeIncrement(challenge.id, challenge.total);
                  }}
                  disabled={isComplete}
                >
                  {isComplete
                    ? 'Completo!'
                    : challengeFeedback === challenge.id
                      ? '+1 registrado!'
                      : 'Registrar progresso'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges Section */}
      <section className={styles.badgesSection}>
        <div className={styles.badgesHeader}>
          <h2 className={styles.badgesTitle}>Badges de Engajamento</h2>
          <span className={styles.badgesCount}>
            {unlockedBadges.length} de {BADGES.length} desbloqueados
          </span>
        </div>

        <div className={styles.badgesGrid}>
          {unlockedBadges.map((badge) => (
            <div
              key={badge.id}
              className={`${styles.badgeItem} ${expandedBadge === badge.id ? styles.badgeItemExpanded : ''}`}
              onClick={() => setExpandedBadge(expandedBadge === badge.id ? null : badge.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedBadge(expandedBadge === badge.id ? null : badge.id);
                }
              }}
            >
              <div
                className={`${styles.badgeItemIcon} ${styles.badgeItemIconUnlocked}`}
              >
                {badge.icon}
              </div>
              <span className={styles.badgeItemName}>{badge.name}</span>
              <span className={styles.badgeItemPoints}>+{badge.points} pts</span>
              {expandedBadge === badge.id && (
                <div className={styles.badgeExpanded}>
                  <p className={styles.badgeDescription}>{badge.description}</p>
                  {badge.unlockedAt && (
                    <p className={styles.badgeDate}>
                      Desbloqueado em {badge.unlockedAt.split('-').reverse().join('/')}
                    </p>
                  )}
                  <button
                    className={styles.badgeShareBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareBadge(badge.id);
                    }}
                  >
                    {sharedBadge === badge.id ? 'Compartilhado!' : 'Compartilhar'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {lockedBadges.map((badge) => (
            <div
              key={badge.id}
              className={`${styles.badgeItem} ${expandedBadge === badge.id ? styles.badgeItemExpanded : ''}`}
              onClick={() => setExpandedBadge(expandedBadge === badge.id ? null : badge.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedBadge(expandedBadge === badge.id ? null : badge.id);
                }
              }}
            >
              <div
                className={`${styles.badgeItemIcon} ${styles.badgeItemIconLocked}`}
              >
                {badge.icon}
              </div>
              <span className={styles.badgeItemName}>{badge.name}</span>
              <span className={styles.badgeItemPoints}>+{badge.points} pts</span>
              {expandedBadge === badge.id && (
                <div className={styles.badgeExpanded}>
                  <p className={styles.badgeDescription}>{badge.description}</p>
                  <p className={styles.badgeLocked}>Ainda nao desbloqueado</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Notification Toast */}
      {showToast && unreadNotification && (
        <div className={styles.toast}>
          <span className={styles.toastEmoji}>{'\u{1F389}'}</span>
          <div className={styles.toastContent}>
            <p className={styles.toastTitle}>{unreadNotification.title}</p>
            <p className={styles.toastMessage}>
              {'\u{1F525}'} {unreadNotification.message}
            </p>
          </div>
          <button
            className={styles.toastClose}
            onClick={() => setShowToast(false)}
            aria-label="Fechar notificacao"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
