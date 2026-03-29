'use client';

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import styles from './gamificacao-config.module.css';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Erro ao carregar dados');
  return r.json();
});

const THEME_LABELS: Record<string, string> = {
  hidratacao: 'Hidratacao',
  sono: 'Sono',
  prevencao: 'Prevencao',
  nutricao: 'Nutricao',
  mental: 'Saude Mental',
  ciclo: 'Ciclo Menstrual',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  voucher: 'Voucher',
  folga: 'Folga',
  produto: 'Produto',
  experiencia: 'Experiencia',
};

interface GamificationConfig {
  company_id: string;
  xp_checkin: number;
  xp_lesson: number;
  xp_quiz: number;
  xp_challenge: number;
  xp_exam: number;
  daily_xp_goal: number;
  streak_notifications: number;
  streak_min_days: number;
  hearts_enabled: number;
  hearts_per_day: number;
  hearts_refill_hours: number;
  league_enabled: number;
  league_anonymous: number;
  active_themes: string[];
  theme_order: string[];
  isDefault?: boolean;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  points_cost: number;
  type: string;
  quantity_available: number;
  active: number;
  total_redemptions?: number;
  pending_redemptions?: number;
}

interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  reward_title: string;
  reward_type: string;
  user_name: string;
  user_email: string;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div
      className={`${styles.toast} ${type === 'success' ? styles.toastSuccess : styles.toastError}`}
      onClick={onClose}
      role="alert"
    >
      {type === 'success' ? '✓ ' : '✕ '}{message}
    </div>
  );
}

export default function GamificacaoConfigPage() {
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch config
  const { data: configData, isLoading: configLoading } = useSWR<GamificationConfig>(
    '/api/gamification/config', fetcher, { revalidateOnFocus: false }
  );

  // Fetch rewards
  const { data: rewardsData, isLoading: rewardsLoading } = useSWR<{ rewards: Reward[]; userPoints: number }>(
    '/api/gamification/rewards', fetcher, { revalidateOnFocus: false }
  );

  // Fetch pending redemptions
  const { data: redemptionsData, isLoading: redemptionsLoading } = useSWR<{ redemptions: Redemption[]; meta: { total: number } }>(
    '/api/gamification/rewards/redemptions?status=pending&limit=50', fetcher, { revalidateOnFocus: false }
  );

  // ── Section 1: XP Config ──
  const [xpValues, setXpValues] = useState<Record<string, number> | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [xpSaving, setXpSaving] = useState(false);

  // Initialize local state from config once loaded
  const config = configData;
  const xp = xpValues ?? {
    xp_checkin: config?.xp_checkin ?? 50,
    xp_lesson: config?.xp_lesson ?? 20,
    xp_quiz: config?.xp_quiz ?? 30,
    xp_challenge: config?.xp_challenge ?? 40,
    xp_exam: config?.xp_exam ?? 100,
  };
  const goal = dailyGoal ?? config?.daily_xp_goal ?? 50;

  const handleXpChange = (key: string, val: number) => {
    setXpValues(prev => ({ ...xp, ...prev, [key]: val }));
  };

  async function saveXpConfig() {
    setXpSaving(true);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...xp, daily_xp_goal: goal }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar XP', 'error');
      } else {
        showToast('Configuracao de XP salva!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
    setXpSaving(false);
  }

  // ── Section 2-4: Toggle configs ──
  const [toggleSaving, setToggleSaving] = useState<string | null>(null);

  async function saveToggle(field: string, value: number) {
    setToggleSaving(field);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar', 'error');
      } else {
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
    setToggleSaving(null);
  }

  async function saveNumericField(field: string, value: number) {
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar', 'error');
      } else {
        showToast('Salvo!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
  }

  // ── Section 5: Themes ──
  const [themesSaving, setThemesSaving] = useState(false);
  const [localActiveThemes, setLocalActiveThemes] = useState<string[] | null>(null);
  const [localThemeOrder, setLocalThemeOrder] = useState<string[] | null>(null);

  const activeThemes = localActiveThemes ?? config?.active_themes ?? Object.keys(THEME_LABELS);
  const themeOrder = localThemeOrder ?? config?.theme_order ?? Object.keys(THEME_LABELS);

  function toggleTheme(theme: string) {
    const current = [...activeThemes];
    const idx = current.indexOf(theme);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(theme);
    }
    setLocalActiveThemes(current);
  }

  function moveTheme(index: number, direction: 'up' | 'down') {
    const order = [...themeOrder];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= order.length) return;
    [order[index], order[swapIdx]] = [order[swapIdx], order[index]];
    setLocalThemeOrder(order);
  }

  async function saveThemes() {
    setThemesSaving(true);
    try {
      const res = await fetch('/api/gamification/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_themes: activeThemes, theme_order: themeOrder }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao salvar temas', 'error');
      } else {
        showToast('Temas salvos!', 'success');
        mutate('/api/gamification/config');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
    setThemesSaving(false);
  }

  // ── Section 6: Rewards ──
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1,
  });
  const [rewardSaving, setRewardSaving] = useState(false);

  async function createReward() {
    if (!rewardForm.title.trim()) {
      showToast('Titulo obrigatorio', 'error');
      return;
    }
    setRewardSaving(true);
    try {
      const res = await fetch('/api/gamification/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rewardForm.title.trim(),
          description: rewardForm.description.trim() || undefined,
          points_cost: rewardForm.points_cost,
          type: rewardForm.type,
          quantity_available: rewardForm.quantity_available,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao criar recompensa', 'error');
      } else {
        showToast('Recompensa criada!', 'success');
        setRewardForm({ title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1 });
        setShowRewardForm(false);
        mutate('/api/gamification/rewards');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
    setRewardSaving(false);
  }

  // Redemption actions
  const [processingRedemption, setProcessingRedemption] = useState<string | null>(null);

  async function handleRedemption(redemptionId: string, status: 'approved' | 'rejected') {
    setProcessingRedemption(redemptionId);
    try {
      const res = await fetch('/api/gamification/rewards/redemptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, status }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(d.error || 'Erro ao processar', 'error');
      } else {
        showToast(status === 'approved' ? 'Resgate aprovado!' : 'Resgate rejeitado', 'success');
        mutate('/api/gamification/rewards/redemptions?status=pending&limit=50');
        mutate('/api/gamification/rewards');
      }
    } catch {
      showToast('Erro de conexao', 'error');
    }
    setProcessingRedemption(null);
  }

  // ── Debounced numeric inputs ──
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [heartsPerDay, setHeartsPerDay] = useState<number | null>(null);
  const [heartsRefill, setHeartsRefill] = useState<number | null>(null);

  const effectiveStreakDays = streakDays ?? config?.streak_min_days ?? 3;
  const effectiveHeartsPerDay = heartsPerDay ?? config?.hearts_per_day ?? 5;
  const effectiveHeartsRefill = heartsRefill ?? config?.hearts_refill_hours ?? 24;

  if (configLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Configuracao de Gamificacao</h1>
        <p className={styles.subtitle}>Carregando...</p>
        <div className={styles.sections}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonBlock} />)}
        </div>
      </div>
    );
  }

  const rewards = rewardsData?.rewards ?? [];
  const pendingRedemptions = redemptionsData?.redemptions ?? [];

  const XP_FIELDS = [
    { key: 'xp_checkin', label: 'Check-in Diario', max: 200 },
    { key: 'xp_lesson', label: 'Licao Concluida', max: 200 },
    { key: 'xp_quiz', label: 'Quiz Respondido', max: 200 },
    { key: 'xp_challenge', label: 'Desafio Completo', max: 300 },
    { key: 'xp_exam', label: 'Exame Realizado', max: 500 },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Configuracao de Gamificacao</h1>
      <p className={styles.subtitle}>Personalize as regras de pontuacao, mecanicas e recompensas da sua empresa</p>

      <div className={styles.sections}>
        {/* ═══ Section 1: XP & Pontuacao ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>⚡</span>
            <h2 className={styles.sectionTitle}>XP e Pontuacao</h2>
          </div>
          <p className={styles.sectionDesc}>
            Defina quantos pontos de experiencia (XP) cada atividade concede as colaboradoras.
          </p>

          {XP_FIELDS.map(({ key, label, max }) => (
            <div key={key} className={styles.xpRow}>
              <span className={styles.xpLabel}>{label}</span>
              <input
                type="range"
                className={styles.xpSlider}
                min={0}
                max={max}
                step={5}
                value={xp[key] ?? 0}
                onChange={e => handleXpChange(key, Number(e.target.value))}
                aria-label={`XP para ${label}`}
              />
              <span className={styles.xpValue}>{xp[key] ?? 0} XP</span>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Meta diaria de XP
                <span className={styles.labelHint}> (minimo para considerar o dia como ativo)</span>
              </label>
              <input
                type="number"
                className={styles.input}
                style={{ maxWidth: 160 }}
                min={10}
                max={500}
                value={goal}
                onChange={e => setDailyGoal(Math.max(10, Math.min(500, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={saveXpConfig} disabled={xpSaving}>
              {xpSaving ? 'Salvando...' : 'Salvar XP'}
            </button>
          </div>
        </section>

        {/* ═══ Section 2: Streak ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🔥</span>
            <h2 className={styles.sectionTitle}>Streak (Sequencia)</h2>
          </div>
          <p className={styles.sectionDesc}>
            A streak conta dias consecutivos de atividade. Colaboradoras que mantiverem a sequencia ganham bonus de XP e badges especiais em marcos como 7, 14, 30 e 60 dias.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Notificacoes de streak</span>
              <span className={styles.toggleDesc}>Enviar lembretes para nao perder a sequencia</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={(config?.streak_notifications ?? 1) === 1}
                onChange={() => saveToggle('streak_notifications', config?.streak_notifications === 1 ? 0 : 1)}
                disabled={toggleSaving === 'streak_notifications'}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Dias minimos para streak</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  className={styles.input}
                  style={{ maxWidth: 100 }}
                  min={1}
                  max={365}
                  value={effectiveStreakDays}
                  onChange={e => setStreakDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                />
                <button
                  className={styles.saveBtnOutline}
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  onClick={() => saveNumericField('streak_min_days', effectiveStreakDays)}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Section 3: Hearts/Vidas ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>❤️</span>
            <h2 className={styles.sectionTitle}>Vidas (Hearts)</h2>
          </div>
          <p className={styles.sectionDesc}>
            O sistema de vidas limita quantas atividades incorretas a colaboradora pode fazer por dia. Ao errar um quiz ou desafio, perde uma vida. Quando acabam as vidas, precisa esperar o recarregamento. Isso incentiva atenção e estudo.
          </p>

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Ativar sistema de vidas</span>
              <span className={styles.toggleDesc}>Quando desativado, erros nao consomem vidas</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={(config?.hearts_enabled ?? 0) === 1}
                onChange={() => saveToggle('hearts_enabled', config?.hearts_enabled === 1 ? 0 : 1)}
                disabled={toggleSaving === 'hearts_enabled'}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {(config?.hearts_enabled ?? 0) === 1 && (
            <div className={styles.formGrid} style={{ marginTop: 16 }}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Vidas por dia</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ maxWidth: 100 }}
                    min={1}
                    max={20}
                    value={effectiveHeartsPerDay}
                    onChange={e => setHeartsPerDay(Math.max(1, Math.min(20, Number(e.target.value))))}
                  />
                  <button
                    className={styles.saveBtnOutline}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    onClick={() => saveNumericField('hearts_per_day', effectiveHeartsPerDay)}
                  >
                    Salvar
                  </button>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tempo de recarga (horas)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ maxWidth: 100 }}
                    min={1}
                    max={168}
                    value={effectiveHeartsRefill}
                    onChange={e => setHeartsRefill(Math.max(1, Math.min(168, Number(e.target.value))))}
                  />
                  <button
                    className={styles.saveBtnOutline}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                    onClick={() => saveNumericField('hearts_refill_hours', effectiveHeartsRefill)}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Section 4: Liga & Competicao ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🏆</span>
            <h2 className={styles.sectionTitle}>Liga e Competicao</h2>
          </div>
          <p className={styles.sectionDesc}>
            Ligas criam competicoes semanais entre colaboradoras. Quem pontuar mais sobe de divisao. A opcao anonima mostra apenas apelidos/iniciais no ranking.
          </p>

          <div className={styles.toggleList}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Ativar ligas</span>
                <span className={styles.toggleDesc}>Competicao semanal com ranking e divisoes</span>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={(config?.league_enabled ?? 1) === 1}
                  onChange={() => saveToggle('league_enabled', config?.league_enabled === 1 ? 0 : 1)}
                  disabled={toggleSaving === 'league_enabled'}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>

            {(config?.league_enabled ?? 1) === 1 && (
              <div className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>Ranking anonimo</span>
                  <span className={styles.toggleDesc}>Exibir apenas apelidos/iniciais em vez de nomes completos</span>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={(config?.league_anonymous ?? 0) === 1}
                    onChange={() => saveToggle('league_anonymous', config?.league_anonymous === 1 ? 0 : 1)}
                    disabled={toggleSaving === 'league_anonymous'}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Section 5: Temas & Trilha ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📚</span>
            <h2 className={styles.sectionTitle}>Temas e Trilha de Saude</h2>
          </div>
          <p className={styles.sectionDesc}>
            Selecione quais temas de saude estao ativos para a empresa e defina a ordem em que aparecem na trilha.
          </p>

          <div style={{ marginBottom: 16 }}>
            <span className={styles.label} style={{ marginBottom: 8, display: 'block' }}>Temas ativos</span>
            <div className={styles.themeGrid}>
              {Object.entries(THEME_LABELS).map(([key, label]) => {
                const isActive = activeThemes.includes(key);
                return (
                  <label
                    key={key}
                    className={`${styles.themeCheckbox} ${isActive ? styles.themeCheckboxActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.themeCheck}
                      checked={isActive}
                      onChange={() => toggleTheme(key)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <span className={styles.label} style={{ marginBottom: 8, display: 'block' }}>Ordem da trilha</span>
            <div className={styles.themeOrderList}>
              {themeOrder.filter(t => activeThemes.includes(t)).map((theme, idx) => (
                <div key={theme} className={styles.themeOrderItem}>
                  <span className={styles.themeOrderIndex}>{idx + 1}.</span>
                  <span className={styles.themeOrderName}>{THEME_LABELS[theme] || theme}</span>
                  <div className={styles.themeOrderBtns}>
                    <button
                      className={styles.themeOrderBtn}
                      onClick={() => moveTheme(themeOrder.indexOf(theme), 'up')}
                      disabled={idx === 0}
                      aria-label={`Mover ${THEME_LABELS[theme]} para cima`}
                    >
                      ▲
                    </button>
                    <button
                      className={styles.themeOrderBtn}
                      onClick={() => moveTheme(themeOrder.indexOf(theme), 'down')}
                      disabled={idx === themeOrder.filter(t => activeThemes.includes(t)).length - 1}
                      aria-label={`Mover ${THEME_LABELS[theme]} para baixo`}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.saveRow}>
            <button className={styles.saveBtn} onClick={saveThemes} disabled={themesSaving}>
              {themesSaving ? 'Salvando...' : 'Salvar Temas'}
            </button>
          </div>
        </section>

        {/* ═══ Section 6: Recompensas ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>🎁</span>
            <h2 className={styles.sectionTitle}>Recompensas</h2>
          </div>
          <p className={styles.sectionDesc}>
            Gerencie as recompensas que as colaboradoras podem resgatar com seus pontos.
          </p>

          {/* Rewards list */}
          {rewardsLoading ? (
            <div className={styles.skeletonBlock} />
          ) : rewards.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎁</div>
              <p className={styles.emptyText}>Nenhuma recompensa cadastrada. Crie a primeira!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className={styles.rewardsTable}>
                <thead>
                  <tr>
                    <th>Titulo</th>
                    <th>Custo</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Resgates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td>{r.points_cost} pts</td>
                      <td>
                        <span className={`${styles.typeBadge} ${
                          r.type === 'voucher' ? styles.typeVoucher :
                          r.type === 'folga' ? styles.typeFolga :
                          r.type === 'produto' ? styles.typeProduto :
                          styles.typeExperiencia
                        }`}>
                          {REWARD_TYPE_LABELS[r.type] || r.type}
                        </span>
                      </td>
                      <td>{r.quantity_available === -1 ? 'Ilimitado' : r.quantity_available}</td>
                      <td>{r.total_redemptions ?? 0}{r.pending_redemptions ? ` (${r.pending_redemptions} pendente${r.pending_redemptions > 1 ? 's' : ''})` : ''}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: r.active ? '#16a34a' : '#9ca3af', marginRight: 6, verticalAlign: 'middle',
                        }} />
                        {r.active ? 'Ativo' : 'Inativo'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* New reward form */}
          {!showRewardForm ? (
            <button className={styles.saveBtnOutline} onClick={() => setShowRewardForm(true)}>
              + Nova Recompensa
            </button>
          ) : (
            <div style={{ background: 'var(--cream-50)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-sm)', padding: 20, marginTop: 8 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-900)', marginBottom: 16 }}>Nova Recompensa</h3>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Titulo *</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Ex: Vale-presente R$50"
                    value={rewardForm.title}
                    onChange={e => setRewardForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={200}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Tipo</label>
                  <select
                    className={styles.select}
                    value={rewardForm.type}
                    onChange={e => setRewardForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="voucher">Voucher</option>
                    <option value="folga">Folga</option>
                    <option value="produto">Produto</option>
                    <option value="experiencia">Experiencia</option>
                  </select>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Custo em pontos *</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={rewardForm.points_cost}
                    onChange={e => setRewardForm(f => ({ ...f, points_cost: Math.max(1, Number(e.target.value)) }))}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Quantidade disponivel
                    <span className={styles.labelHint}> (-1 = ilimitado)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="number"
                    min={-1}
                    value={rewardForm.quantity_available}
                    onChange={e => setRewardForm(f => ({ ...f, quantity_available: Number(e.target.value) }))}
                  />
                </div>
                <div className={`${styles.fieldGroup} ${styles.fieldGroupFull}`}>
                  <label className={styles.label}>Descricao</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Descricao opcional da recompensa"
                    value={rewardForm.description}
                    onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                    maxLength={1000}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                <button
                  className={styles.saveBtnOutline}
                  onClick={() => { setShowRewardForm(false); setRewardForm({ title: '', description: '', points_cost: 100, type: 'voucher', quantity_available: -1 }); }}
                >
                  Cancelar
                </button>
                <button className={styles.saveBtn} onClick={createReward} disabled={rewardSaving || !rewardForm.title.trim()}>
                  {rewardSaving ? 'Criando...' : 'Criar Recompensa'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Section 7: Resgates Pendentes ═══ */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>📋</span>
            <h2 className={styles.sectionTitle}>Resgates Pendentes</h2>
          </div>
          <p className={styles.sectionDesc}>
            Aprove ou rejeite os resgates de recompensas solicitados pelas colaboradoras.
          </p>

          {redemptionsLoading ? (
            <div className={styles.skeletonBlock} />
          ) : pendingRedemptions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>✅</div>
              <p className={styles.emptyText}>Nenhum resgate pendente no momento</p>
            </div>
          ) : (
            <div>
              {pendingRedemptions.map(r => (
                <div key={r.id} className={styles.redemptionCard}>
                  <div className={styles.redemptionInfo}>
                    <div className={styles.redemptionUser}>{r.user_name}</div>
                    <div className={styles.redemptionReward}>
                      {r.reward_title} — <strong>{r.points_spent} pts</strong>
                      {' '}
                      <span className={`${styles.typeBadge} ${
                        r.reward_type === 'voucher' ? styles.typeVoucher :
                        r.reward_type === 'folga' ? styles.typeFolga :
                        r.reward_type === 'produto' ? styles.typeProduto :
                        styles.typeExperiencia
                      }`}>
                        {REWARD_TYPE_LABELS[r.reward_type] || r.reward_type}
                      </span>
                    </div>
                    <div className={styles.redemptionDate}>
                      {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className={styles.redemptionActions}>
                    <button
                      className={styles.saveBtnSuccess}
                      onClick={() => handleRedemption(r.id, 'approved')}
                      disabled={processingRedemption === r.id}
                    >
                      {processingRedemption === r.id ? '...' : 'Aprovar'}
                    </button>
                    <button
                      className={styles.saveBtnDanger}
                      onClick={() => handleRedemption(r.id, 'rejected')}
                      disabled={processingRedemption === r.id}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
