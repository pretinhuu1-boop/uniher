'use client';

import { useState } from 'react';
import { CHALLENGES } from '@/data/mock-collaborator';
import type { Challenge } from '@/types/platform';
import styles from './desafios.module.css';

type TabKey = 'active' | 'completed' | 'locked';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Ativos' },
  { key: 'completed', label: 'Concluidos' },
  { key: 'locked', label: 'Bloqueados' },
];

const CATEGORIES = ['Hábitos', 'Saúde Mental', 'Prevenção', 'Sono', 'Nutrição'];

export default function DesafiosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([...CHALLENGES]);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    total: '',
    points: '',
  });

  const filtered = challenges.filter((c) => {
    if (activeTab === 'active') return c.status === 'active';
    if (activeTab === 'completed') return c.status === 'completed';
    return c.status === 'locked';
  });

  function handleIncrement(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.status !== 'active') return c;
        const newProgress = c.progress + 1;
        if (newProgress >= c.total) {
          setJustCompleted(id);
          setTimeout(() => setJustCompleted(null), 2500);
          return { ...c, progress: c.total, status: 'completed' as const };
        }
        return { ...c, progress: newProgress };
      })
    );
  }

  function handleShare(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSharedId(id);
    setTimeout(() => setSharedId(null), 2000);
  }

  function handleCreate() {
    if (!formData.title.trim() || !formData.total || !formData.points) return;
    const newChallenge: Challenge = {
      id: `c-${Date.now()}`,
      title: formData.title,
      description: formData.description || 'Novo desafio personalizado',
      progress: 0,
      total: parseInt(formData.total, 10) || 5,
      points: parseInt(formData.points, 10) || 50,
      status: 'active',
      category: formData.category,
    };
    setChallenges((prev) => [newChallenge, ...prev]);
    setFormData({ title: '', description: '', category: CATEGORIES[0], total: '', points: '' });
    setShowForm(false);
    setActiveTab('active');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Desafios</h1>
        <button className={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          + Novo Desafio
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Criar Novo Desafio</h3>
          <div className={styles.formGrid}>
            <input
              className={styles.formInput}
              placeholder="Nome do desafio"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <input
              className={styles.formInput}
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <select
              className={styles.formSelect}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              className={styles.formInput}
              placeholder="Meta (total)"
              type="number"
              min={1}
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: e.target.value })}
            />
            <input
              className={styles.formInput}
              placeholder="Pontos"
              type="number"
              min={1}
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: e.target.value })}
            />
          </div>
          <div className={styles.formActions}>
            <button className={styles.createBtn} onClick={handleCreate}>Criar</button>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {filtered.length === 0 && (
          <div className={styles.empty}>Nenhum desafio nesta categoria.</div>
        )}
        {filtered.map((challenge) => {
          const isExpanded = expandedId === challenge.id;
          const wasJustCompleted = justCompleted === challenge.id;

          return (
            <div
              key={challenge.id}
              className={`${styles.card} ${challenge.status === 'locked' ? styles.cardLocked : ''} ${isExpanded ? styles.cardExpanded : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : challenge.id)}
            >
              {wasJustCompleted && (
                <div className={styles.confetti}>🎉 Concluído!</div>
              )}

              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <span className={styles.cardTitle}>
                    {challenge.status === 'completed' && <span className={styles.checkIcon}>&#10003;</span>}
                    {challenge.status === 'locked' && <span className={styles.lockIcon}>&#128274;</span>}
                    {challenge.title}
                  </span>
                  <span className={styles.cardDesc}>{challenge.description}</span>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.categoryTag}>{challenge.category}</span>
                  <span className={styles.pointsBadge}>&#9733; {challenge.points} pts</span>
                  {challenge.status === 'active' && (
                    <button
                      className={styles.incrementBtn}
                      onClick={(e) => handleIncrement(challenge.id, e)}
                      title="Registrar progresso"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {challenge.status === 'active' && (
                <div className={styles.progressRow}>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                    />
                  </div>
                  <span className={styles.progressLabel}>
                    {challenge.progress}/{challenge.total}
                  </span>
                </div>
              )}

              {challenge.status === 'completed' && (
                <div className={styles.progressRow}>
                  <div className={styles.progressTrack}>
                    <div
                      className={`${styles.progressFill} ${styles.progressFillComplete}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <span className={styles.progressLabel}>
                    {challenge.total}/{challenge.total}
                  </span>
                </div>
              )}

              {challenge.deadline && (
                <span className={styles.deadline}>Prazo: {challenge.deadline}</span>
              )}

              {/* ── Expanded content ── */}
              {isExpanded && (
                <div className={styles.expandedContent}>
                  <div className={styles.expandedStats}>
                    <span>Início: 01/02</span>
                    <span>Participantes: 156</span>
                  </div>

                  {challenge.status === 'active' && (
                    <>
                      <p className={styles.expandedDesc}>
                        Acompanhe seu progresso diário e mantenha a consistência. Cada registro
                        conta como um passo em direção ao seu objetivo de bem-estar.
                      </p>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => handleIncrement(challenge.id, e)}
                      >
                        Registrar progresso
                      </button>
                    </>
                  )}

                  {challenge.status === 'completed' && (
                    <>
                      <p className={styles.expandedDesc}>
                        Parabéns por concluir este desafio! Compartilhe sua conquista com suas
                        colegas e inspire mais pessoas.
                      </p>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => handleShare(challenge.id, e)}
                      >
                        {sharedId === challenge.id ? '✓ Compartilhado!' : 'Compartilhar conquista'}
                      </button>
                    </>
                  )}

                  {challenge.status === 'locked' && (
                    <>
                      <p className={styles.expandedDesc}>
                        Este desafio requer um nível maior de engajamento na plataforma.
                        Continue participando para desbloquear novos desafios.
                      </p>
                      <div className={styles.lockInfo}>
                        <strong>Desbloqueio em: Nível 8</strong>
                      </div>
                      <div className={styles.lockExplain}>
                        <strong>O que é preciso?</strong> Complete mais 3 desafios ativos e
                        alcance 500 pontos para atingir o Nível 8.
                      </div>
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
