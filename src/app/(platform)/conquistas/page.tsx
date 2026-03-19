'use client';

import { useState } from 'react';
import { BADGES, COLLABORATOR_HOME } from '@/data/mock-collaborator';
import styles from './conquistas.module.css';

const BADGE_REQUIREMENTS: Record<string, string> = {
  default: 'Complete mais atividades e desafios para desbloquear este badge.',
};

export default function ConquistasPage() {
  const unlockedCount = BADGES.filter(b => b.unlockedAt).length;
  const completedChallenges = 7;
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [sharedBadge, setSharedBadge] = useState<string | null>(null);

  const stats = [
    { label: 'Total de acessos', value: COLLABORATOR_HOME.streakDays },
    { label: 'Badges conquistados', value: unlockedCount },
    { label: 'Desafios concluidos', value: completedChallenges },
    { label: 'Taxa de engajamento', value: `${COLLABORATOR_HOME.engagementStats.openRate}%` },
  ];

  function handleBadgeClick(badgeId: string) {
    setExpandedBadge(expandedBadge === badgeId ? null : badgeId);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Conquistas</h1>
      <p className={styles.subtitle}>Badges e desafios por dia</p>

      <div className={styles.statsRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.badgeGrid}>
        {BADGES.map((badge) => {
          const isUnlocked = !!badge.unlockedAt;
          const isExpanded = expandedBadge === badge.id;
          return (
            <div
              key={badge.id}
              className={`${styles.badgeCard} ${isUnlocked ? styles.badgeUnlocked : styles.badgeLocked} ${isExpanded ? styles.badgeExpanded : ''}`}
              onClick={() => handleBadgeClick(badge.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBadgeClick(badge.id);
                }
              }}
            >
              <div className={styles.badgeIcon}>{badge.icon}</div>
              <span className={styles.badgeName}>{badge.name}</span>
              <span className={styles.badgeDesc}>{badge.description}</span>
              <span className={styles.badgePoints}>&#9733; {badge.points} pts</span>
              {isUnlocked ? (
                <span className={styles.badgeDate}>
                  Desbloqueado em {new Date(badge.unlockedAt!).toLocaleDateString('pt-BR')}
                </span>
              ) : (
                <span className={styles.badgeLockLabel}>&#128274; Bloqueado</span>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className={styles.badgeExpandedContent}>
                  {isUnlocked ? (
                    <>
                      <p className={styles.badgeExpandedDesc}>{badge.description}</p>
                      <p className={styles.badgeExpandedDate}>
                        Conquistado em {new Date(badge.unlockedAt!).toLocaleDateString('pt-BR')}
                      </p>
                      <button
                        className={styles.badgeShareBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharedBadge(badge.id);
                          setTimeout(() => setSharedBadge(null), 2000);
                        }}
                      >
                        {sharedBadge === badge.id ? '✓ Compartilhado!' : 'Compartilhar conquista'}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className={styles.badgeExpandedDesc}>
                        {BADGE_REQUIREMENTS[badge.id] || BADGE_REQUIREMENTS.default}
                      </p>
                      <p className={styles.badgeWhatsMissing}>
                        O que falta? Continue participando das campanhas e completando desafios para desbloquear.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
