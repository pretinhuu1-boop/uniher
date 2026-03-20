'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorHome, useCollaboratorBadges, useCollaboratorChallenges, useNotifications } from '@/hooks/useCollaborator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StreakStatus {
  streak: number; freezes: number; checkedInToday: boolean;
  dailyXpEarned: number; dailyXpGoal: number; points: number; level: number;
  levelInfo: { level: number; currentXP: number; nextLevelXP: number };
}

interface DailyMission {
  id: string; title: string; description: string; xp: number;
  category: string; action: string; completed: boolean;
}

interface LeagueStatus {
  currentLeague: string; rank: number; weekPoints: number;
  totalInLeague: number; promoteZone: boolean; relegateZone: boolean;
  meta: { label: string; color: string; icon: string };
}

export default function ColaboradoraPage() {
  const { data } = useCollaboratorHome();
  const { badges: allBadges } = useCollaboratorBadges();
  const { challenges } = useCollaboratorChallenges();
  const { notifications } = useNotifications();

  const unreadNotification = notifications.find((n: any) => !n.read && n.type === 'badge');
  const [showToast, setShowToast] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>({});
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);
  const [panicContact, setPanicContact] = useState<{ name: string; phone: string } | null>(null);
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus | null>(null);
  const [missionFeedback, setMissionFeedback] = useState<string | null>(null);
  const [levelUpBurst, setLevelUpBurst] = useState(false);
  const [activeMission, setActiveMission] = useState<DailyMission | null>(null);
  const [missionPayload, setMissionPayload] = useState<{ mood?: string; glasses?: number; challengeId?: string; badgeId?: string; note?: string; confirmed?: boolean }>({});
  const [missionSubmitting, setMissionSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then(r => r.json())
      .then(({ user }) => {
        if (user?.emergency_contact_name && user?.emergency_contact_phone) {
          setPanicContact({ name: user.emergency_contact_name, phone: user.emergency_contact_phone });
        }
      })
      .catch(() => {});

    // Load gamification data
    fetch('/api/gamification/streak-status').then(r => r.json()).then(setStreakStatus).catch(() => {});
    fetch('/api/gamification/daily-missions').then(r => r.json()).then(d => setDailyMissions(d.missions || [])).catch(() => {});
    fetch('/api/gamification/league').then(r => r.json()).then(d => setLeagueStatus(d.status)).catch(() => {});
  }, []);

  useEffect(() => {
    const map: Record<string, number> = {};
    challenges.forEach((c: any) => { map[c.id] = c.progress ?? 0; });
    setChallengeProgress(map);
  }, [challenges]);

  useEffect(() => {
    const t = setTimeout(() => setShowToast(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const unlockedBadges = allBadges.filter((b: any) => b.unlockedAt);
  const lockedBadges = allBadges.filter((b: any) => !b.unlockedAt);
  const activeChallenges = challenges.filter((c: any) => c.status === 'active');

  const totalForLevel = data.points + data.pointsNextLevel;
  const progressPercent = Math.round((data.points / totalForLevel) * 100);

  const { mutate: mutateHome } = useCollaboratorHome();
  const { mutate: mutateChallenges } = useCollaboratorChallenges();

  async function handleChallengeIncrement(id: string, total: number) {
    const cur = challengeProgress[id] ?? 0;
    if (cur >= total) return;

    setChallengeFeedback(id);
    
    try {
      await fetch(`/api/collaborator/challenges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment: 1 })
      });
      
      // Optimistic update
      setChallengeProgress(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
      mutateHome(); 
      mutateChallenges();
    } catch (err) {
      console.error('Erro ao atualizar desafio:', err);
    } finally {
      setTimeout(() => setChallengeFeedback(null), 2000);
    }
  }

  async function handleCheckIn() {
    if (checkedIn || streakStatus?.checkedInToday) return;
    try {
      const res = await fetch('/api/gamification/check-in', { method: 'POST' });
      const result = await res.json();
      setCheckedIn(true);
      if (result.leveledUp) { setLevelUpBurst(true); setTimeout(() => setLevelUpBurst(false), 3000); }
      // Refresh streak & missions
      fetch('/api/gamification/streak-status').then(r => r.json()).then(setStreakStatus).catch(() => {});
      fetch('/api/gamification/daily-missions').then(r => r.json()).then(d => setDailyMissions(d.missions || [])).catch(() => {});
      mutateHome();
    } catch (err) {
      console.error('Erro no check-in:', err);
    }
  }

  function openMissionModal(mission: DailyMission) {
    setActiveMission(mission);
    setMissionPayload({});
    setMissionSubmitting(false);
  }

  async function submitMission() {
    if (!activeMission || missionSubmitting) return;
    setMissionSubmitting(true);
    try {
      const res = await fetch(`/api/gamification/daily-missions/${activeMission.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionPayload),
      });
      const result = await res.json();
      if (result.success) {
        setDailyMissions(prev => prev.map(m => m.id === activeMission.id ? { ...m, completed: true } : m));
        setActiveMission(null);
        if (result.leveledUp) { setLevelUpBurst(true); setTimeout(() => setLevelUpBurst(false), 3000); }
        fetch('/api/gamification/streak-status').then(r => r.json()).then(setStreakStatus).catch(() => {});
        mutateChallenges();
        mutateHome();
      }
    } catch { /* noop */ } finally {
      setMissionSubmitting(false);
    }
  }

  function handlePanic() {
    if (!panicContact) return;
    const msg = encodeURIComponent(
      `🆘 Preciso de ajuda! Estou passando por um momento difícil agora. Por favor, entre em contato comigo o quanto antes.`
    );
    const phone = panicContact.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    setShowPanicConfirm(false);
  }

  const isCheckedIn = checkedIn || (streakStatus?.checkedInToday ?? false);
  const dailyXpPct = streakStatus ? Math.min(100, Math.round((streakStatus.dailyXpEarned / streakStatus.dailyXpGoal) * 100)) : 0;
  const levelXpPct = streakStatus?.levelInfo ? Math.round((streakStatus.levelInfo.currentXP / streakStatus.levelInfo.nextLevelXP) * 100) : 0;

  const statCards = [
    { key: 'exams', icon: '📈', value: `${data.examsPercent}%`, label: 'Exames em Dia', sub: `${Math.round((data.examsPercent / 100) * (data.examsTotal || 5))}/${data.examsTotal || 5}`, color: 'bg-rose-50 text-rose-500' },
    { key: 'content', icon: '📖', value: `${data.contentViewed}`, label: 'Conteúdos Vistos', sub: 'Este mês', color: 'bg-violet-50 text-violet-500' },
    { key: 'campaigns', icon: '📅', value: `${data.campaignsActive}`, label: 'Campanhas', sub: `de ${data.campaignsTotal || 4}`, color: 'bg-amber-50 text-amber-500' },
    { key: 'streak', icon: '🔥', value: `${data.streakDays}`, label: 'Dias de Streak', sub: '\u00A0', color: 'bg-orange-50 text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 font-body animate-fadeIn">

      {/* ── Greeting Header ── */}
      <section className="relative bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600 rounded-2xl p-8 text-white overflow-hidden shadow-xl shadow-rose/20">
        <div className="absolute inset-0 overflow-hidden">
          {/* Confetti dots */}
          {['top-8 left-20 w-3 h-3 bg-yellow-300', 'top-12 right-32 w-2 h-2 bg-green-300', 'top-4 right-16 w-4 h-4 bg-blue-300 rotate-45',
            'bottom-8 left-32 w-3 h-3 bg-purple-300', 'bottom-4 right-20 w-2 h-2 bg-pink-200'].map((cls, i) => (
            <div key={i} className={`absolute ${cls} rounded-sm opacity-70 animate-float`} style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-rose-100 text-sm font-medium mb-1" suppressHydrationWarning>📅 {data.date}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold" suppressHydrationWarning>{data.greeting}, <span className="text-yellow-200">{data.userName}</span> 👋</h1>
            <a href="/semaforo" className="mt-2 inline-flex items-center gap-2 text-white/90 text-sm bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 hover:bg-white/20 transition-colors">
              <span className="w-2 h-2 rounded-full bg-orange-300 animate-pulse" />
              {data.healthAlert} →
            </a>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn}
            className={cn(
              "flex-shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all",
              isCheckedIn
                ? "bg-white/20 text-white cursor-default"
                : "bg-white text-rose-500 hover:shadow-lg hover:scale-105 active:scale-95"
            )}
          >
            {isCheckedIn ? '✔ Check-in feito!' : '⭐ Fazer Check-in'}
          </button>
        </div>
      </section>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.key} className="bg-white rounded-2xl p-5 border border-border-1 shadow-sm hover:shadow-md transition-shadow">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3", card.color)}>
              {card.icon}
            </div>
            <div className="text-2xl font-display font-bold text-uni-text-900">{card.value}</div>
            <div className="text-xs font-bold text-uni-text-600 mt-1">{card.label}</div>
            <div className="text-[10px] text-uni-text-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Level Bar ── */}
      <section className="bg-white rounded-2xl p-6 border border-border-1 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl">⭐</div>
            <div>
              <span className="font-bold text-uni-text-900 text-lg">Nível {data.level}</span>
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{data.points.toLocaleString('pt-BR')} pts</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unlockedBadges.slice(0, 3).map((b: any) => (
              <span key={b.id} title={b.name} className="text-lg cursor-default">{b.icon}</span>
            ))}
            <span className="text-xs font-bold text-uni-text-400">🏆 {data.achievementCount} conquistas</span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-cream-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-[11px] text-uni-text-400 mt-2">{data.pointsNextLevel} pts para o próximo nível</p>
      </section>

      {/* ── Level Up Burst ── */}
      {levelUpBurst && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl">
              Level Up! Nível {streakStatus?.levelInfo?.level}!
            </div>
          </div>
        </div>
      )}

      {/* ── Gamification Row: Streak + Daily XP + League ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Streak */}
        <div className="bg-white border border-border-1 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-uni-text-900 text-sm">Sequência</span>
            {streakStatus && streakStatus.freezes > 0 && (
              <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                ❄️ {streakStatus.freezes} freeze{streakStatus.freezes > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-display font-bold text-orange-500">{streakStatus?.streak ?? 0}</span>
            <span className="text-sm text-uni-text-400 mb-1">dias 🔥</span>
          </div>
          <div className="flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className={cn("flex-1 h-1.5 rounded-full", i < Math.min(7, streakStatus?.streak ?? 0) ? "bg-orange-400" : "bg-cream-100")} />
            ))}
          </div>
          <p className="text-[10px] text-uni-text-400 mt-2">
            {streakStatus?.streak === 0 ? 'Faça check-in para começar!' :
             streakStatus?.streak === 1 ? 'Ótimo começo! Continue amanhã.' :
             `${7 - ((streakStatus?.streak ?? 0) % 7)} dias para o próximo marco`}
          </p>
        </div>

        {/* Daily XP Goal */}
        <div className="bg-white border border-border-1 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-uni-text-900 text-sm">Meta Diária de XP</span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
              dailyXpPct >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            )}>
              {dailyXpPct >= 100 ? '✔ Completa!' : `${dailyXpPct}%`}
            </span>
          </div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-3xl font-display font-bold text-rose-500">{streakStatus?.dailyXpEarned ?? 0}</span>
            <span className="text-sm text-uni-text-400 mb-1">/ {streakStatus?.dailyXpGoal ?? 20} XP</span>
          </div>
          <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", dailyXpPct >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-rose-400 to-pink-500")}
              style={{ width: `${Math.min(100, dailyXpPct)}%` }}
            />
          </div>
          <p className="text-[10px] text-uni-text-400 mt-2">
            {dailyXpPct >= 100 ? 'Meta atingida! Continue ganhando XP.' : `Faltam ${(streakStatus?.dailyXpGoal ?? 20) - (streakStatus?.dailyXpEarned ?? 0)} XP`}
          </p>
        </div>

        {/* League */}
        <Link href="/liga" className="bg-white border border-border-1 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow block">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-uni-text-900 text-sm">Liga Semanal</span>
            {leagueStatus && (
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                leagueStatus.promoteZone ? "bg-emerald-50 text-emerald-600" :
                leagueStatus.relegateZone ? "bg-red-50 text-red-500" :
                "bg-gray-50 text-gray-500"
              )}>
                {leagueStatus.promoteZone ? '↑ Promoção' : leagueStatus.relegateZone ? '↓ Rebaixamento' : 'Zona Segura'}
              </span>
            )}
          </div>
          {leagueStatus ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{leagueStatus.meta.icon}</span>
                <div>
                  <div className="font-bold text-uni-text-900">{leagueStatus.meta.label}</div>
                  <div className="text-xs text-uni-text-400">#{leagueStatus.rank} de {leagueStatus.totalInLeague}</div>
                </div>
              </div>
              <div className="text-xs text-uni-text-500">{leagueStatus.weekPoints} pts esta semana →</div>
            </>
          ) : (
            <div className="text-sm text-uni-text-400">Carregando...</div>
          )}
        </Link>
      </div>

      {/* ── Daily Missions ── */}
      <section className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-uni-text-900">Missões Diárias</h2>
            <p className="text-xs text-uni-text-400 mt-0.5">
              {dailyMissions.filter(m => m.completed).length}/{dailyMissions.length} completadas hoje
            </p>
          </div>
          <div className="flex gap-1">
            {dailyMissions.map(m => (
              <div key={m.id} className={cn("w-3 h-3 rounded-full", m.completed ? "bg-emerald-400" : "bg-cream-100")} />
            ))}
          </div>
        </div>

        {dailyMissions.length === 0 ? (
          <p className="text-sm text-uni-text-400 text-center py-4">Faça check-in para desbloquear as missões de hoje!</p>
        ) : (
          <div className="space-y-3">
            {dailyMissions.map(m => (
              <div key={m.id} className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                m.completed
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-cream-50 border-border-1 hover:border-rose-200"
              )}>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0",
                  m.completed ? "bg-emerald-100" : "bg-white border border-border-1"
                )}>
                  {m.completed ? '✅' : m.category === 'Rotina' ? '⭐' : m.category === 'Saúde' ? '💊' : m.category === 'Desafios' ? '🏆' : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-uni-text-900 text-sm">{m.title}</div>
                  <div className="text-xs text-uni-text-400 mt-0.5">{m.description}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">+{m.xp} XP</span>
                  {!m.completed && (
                    <button
                      onClick={() => openMissionModal(m)}
                      className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 active:scale-95 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Registrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {dailyMissions.length > 0 && dailyMissions.every(m => m.completed) && (
          <div className="mt-4 text-center bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
            <div className="text-2xl mb-1">🎯</div>
            <p className="font-bold text-emerald-700 text-sm">Todas as missões completadas!</p>
            <p className="text-xs text-emerald-600 mt-0.5">Volte amanhã para novas missões</p>
          </div>
        )}
      </section>

      {/* ── Engagement & Badges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Banner */}
        <section className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-uni-text-900">Seu Engajamento</h2>
              <p className="text-xs text-uni-text-500">Continue assim!</p>
            </div>
            <Link href="/desafios" className="text-xs font-bold text-rose-500 hover:underline">Ver mais →</Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: data.engagementStats?.streakDays, unit: 'dias', label: 'Dias de streak', icon: '🔥' },
              { value: `${data.engagementStats?.openRate}%`, unit: '', label: 'Taxa de abertura', icon: '👁' },
              { value: data.engagementStats?.actionsToday, unit: '', label: 'Ações hoje', icon: '✅' },
            ].map((m, i) => (
              <div key={i} className="text-center bg-white/60 rounded-xl p-3">
                <div className="text-lg mb-1">{m.icon}</div>
                <div className="text-xl font-display font-bold text-uni-text-900">{m.value}<span className="text-xs text-uni-text-400"> {m.unit}</span></div>
                <div className="text-[10px] text-uni-text-500 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Badges */}
        <section className="bg-white border border-border-1 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-uni-text-900">Badges de Engajamento</h2>
            <span className="text-xs text-uni-text-400">{unlockedBadges.length} de {allBadges.length} desbloqueados</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {allBadges.slice(0, 6).map((badge: any) => (
              <div key={badge.id} className={cn("flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all", badge.unlockedAt ? "bg-amber-50 border border-amber-100" : "bg-gray-50 opacity-40 grayscale")}>
                <div className="text-2xl">{badge.icon}</div>
                <span className="text-[10px] font-bold text-uni-text-600 leading-tight">{badge.name}</span>
                {badge.unlockedAt && <span className="text-[9px] text-amber-600">+{badge.points} pts</span>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Active Challenges ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-uni-text-900">Desafios Ativos</h2>
          <Link href="/desafios" className="text-sm font-bold text-rose-500 hover:underline">Ver todos →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeChallenges.map((ch: any) => {
            const prog = challengeProgress[ch.id] ?? ch.progress;
            const pct = Math.round((prog / ch.total) * 100);
            const done = prog >= ch.total;
            return (
              <div key={ch.id} className="bg-white border border-border-1 rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{ch.category}</span>
                    <h3 className="font-bold text-uni-text-900 mt-1">{ch.title}</h3>
                    <p className="text-xs text-uni-text-500 mt-0.5">{ch.description}</p>
                  </div>
                  <span className="text-xs font-bold text-uni-green bg-emerald-50 px-2 py-1 rounded-full ml-3 flex-shrink-0">+{ch.points} pts</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-uni-text-400">
                    <span>{prog}/{ch.total}</span>
                    {ch.deadline && <span>Até {ch.deadline.split('-').reverse().join('/')}</span>}
                  </div>
                  <div className="h-1.5 w-full bg-cream-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => handleChallengeIncrement(ch.id, ch.total)}
                  disabled={done}
                  className={cn("mt-4 w-full py-2 rounded-xl text-sm font-bold transition-all",
                    done ? "bg-emerald-50 text-emerald-600 cursor-default"
                      : challengeFeedback === ch.id ? "bg-rose-100 text-rose-600"
                        : "bg-rose-500 text-white hover:bg-rose-600 active:scale-95"
                  )}
                >
                  {done ? '✔ Completo!' : challengeFeedback === ch.id ? '+1 registrado!' : 'Registrar progresso'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Panic Button ── */}
      {panicContact && (
        <section className="bg-white border border-border-1 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-bold text-uni-text-900 text-sm">Precisa de ajuda agora?</h2>
              <p className="text-xs text-uni-text-400 mt-0.5">
                Envie uma mensagem de alerta para <strong>{panicContact.name}</strong> com um toque.
              </p>
            </div>
            <button
              onClick={() => setShowPanicConfirm(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-95 transition-all shadow-sm"
            >
              🆘 Botão de Pânico
            </button>
          </div>
        </section>
      )}

      {!panicContact && (
        <section className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-2xl">🆘</span>
            <div className="flex-1">
              <h2 className="font-bold text-uni-text-900 text-sm">Configure seu botão de pânico</h2>
              <p className="text-xs text-uni-text-400 mt-0.5">Cadastre um contato de confiança nas configurações para ativar o botão de pânico.</p>
            </div>
            <a
              href="/configuracoes"
              className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-all"
            >
              Configurar →
            </a>
          </div>
        </section>
      )}

      {/* ── Panic Confirm Modal ── */}
      {showPanicConfirm && panicContact && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slideUp">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🆘</div>
              <h3 className="font-bold text-uni-text-900 text-lg">Enviar alerta?</h3>
              <p className="text-sm text-uni-text-500 mt-1">
                Uma mensagem de emergência será enviada para <strong>{panicContact.name}</strong> ({panicContact.phone}) via WhatsApp.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPanicConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-1 text-uni-text-600 font-bold text-sm hover:bg-cream-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handlePanic}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
              >
                Enviar alerta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mission Registration Modal ── */}
      {activeMission && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setActiveMission(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl">
                {activeMission.category === 'Rotina' ? '⭐' : activeMission.category === 'Saúde' ? '💧' : activeMission.category === 'Desafios' ? '🏆' : '📖'}
              </div>
              <div>
                <h3 className="font-bold text-uni-text-900">{activeMission.title}</h3>
                <p className="text-xs text-uni-text-400">{activeMission.description}</p>
              </div>
              <span className="ml-auto text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">+{activeMission.xp} XP</span>
            </div>

            {/* check_in: mood selector */}
            {activeMission.action === 'check_in' && (
              <div>
                <p className="text-sm font-bold text-uni-text-700 mb-3">Como você está hoje?</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'tired', emoji: '😴', label: 'Cansada' },
                    { key: 'ok', emoji: '😐', label: 'Ok' },
                    { key: 'good', emoji: '😊', label: 'Bem' },
                    { key: 'great', emoji: '🔥', label: 'Ótima' },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => setMissionPayload(p => ({ ...p, mood: m.key }))}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                        missionPayload.mood === m.key ? 'border-rose-400 bg-rose-50' : 'border-border-1 hover:border-rose-200'
                      )}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[10px] font-bold text-uni-text-600">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* drink_water: glass counter */}
            {activeMission.action === 'drink_water' && (
              <div>
                <p className="text-sm font-bold text-uni-text-700 mb-3">Quantos copos de água você bebeu hoje?</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setMissionPayload(p => ({ ...p, glasses: n }))}
                      className={cn(
                        'w-11 h-11 rounded-xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-0.5',
                        (missionPayload.glasses ?? 0) >= n ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-border-1 text-uni-text-400'
                      )}
                    >
                      <span className="text-base">💧</span>
                      <span className="text-[10px]">{n}</span>
                    </button>
                  ))}
                </div>
                {(missionPayload.glasses ?? 0) > 0 && (missionPayload.glasses ?? 0) < 4 && (
                  <p className="text-xs text-amber-600 mt-1">💡 Tente chegar em pelo menos 4 copos por dia!</p>
                )}
                {(missionPayload.glasses ?? 0) >= 4 && (
                  <p className="text-xs text-emerald-600 mt-1">✔ Ótimo! Você está bem hidratada.</p>
                )}
              </div>
            )}

            {/* complete_challenge: pick active challenge */}
            {activeMission.action === 'complete_challenge' && (
              <div>
                <p className="text-sm font-bold text-uni-text-700 mb-3">Qual desafio você avançou hoje?</p>
                {activeChallenges.length === 0 ? (
                  <p className="text-sm text-uni-text-400 text-center py-3">Nenhum desafio ativo. <a href="/desafios" className="text-rose-500 font-bold">Adicionar desafio →</a></p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeChallenges.map((ch: any) => (
                      <button
                        key={ch.id}
                        onClick={() => setMissionPayload(p => ({ ...p, challengeId: ch.id }))}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-2 transition-all',
                          missionPayload.challengeId === ch.id ? 'border-rose-400 bg-rose-50' : 'border-border-1 hover:border-rose-200'
                        )}
                      >
                        <div className="font-bold text-sm text-uni-text-900">{ch.title}</div>
                        <div className="text-xs text-uni-text-400 mt-0.5">{challengeProgress[ch.id] ?? ch.progress}/{ch.total} etapas</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* update_semaforo: must confirm via checkbox after opening page */}
            {activeMission.action === 'update_semaforo' && (
              <div className="space-y-3">
                <a
                  href="/semaforo"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  🚦 Abrir Semáforo de Saúde →
                </a>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 accent-rose-500 flex-shrink-0"
                    checked={missionPayload.confirmed ?? false}
                    onChange={e => setMissionPayload(p => ({ ...p, confirmed: e.target.checked }))}
                  />
                  <span className="text-sm text-uni-text-700">Confirmei que abri e atualizei meu Semáforo de Saúde hoje</span>
                </label>
              </div>
            )}

            {/* read_content: must write what was read (min 10 chars) */}
            {activeMission.action === 'read_content' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-700">
                  📖 Leia um artigo, conteúdo ou dica de saúde feminina e escreva sobre o que aprendeu.
                </div>
                <div>
                  <p className="text-sm font-bold text-uni-text-700 mb-1">O que você leu hoje? <span className="text-rose-500">*</span></p>
                  <textarea
                    className="w-full border border-border-1 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                    rows={3}
                    placeholder="Ex: Li sobre os benefícios do sono reparador para a saúde hormonal..."
                    value={missionPayload.note ?? ''}
                    onChange={e => setMissionPayload(p => ({ ...p, note: e.target.value }))}
                  />
                  <p className="text-[11px] text-right mt-1" style={{ color: (missionPayload.note?.length ?? 0) >= 10 ? '#16a34a' : '#9ca3af' }}>
                    {missionPayload.note?.length ?? 0}/10 mínimo
                  </p>
                </div>
              </div>
            )}

            {/* share_badge: must select an unlocked badge */}
            {activeMission.action === 'share_badge' && (
              <div>
                <p className="text-sm font-bold text-uni-text-700 mb-3">Qual conquista você quer celebrar? <span className="text-rose-500">*</span></p>
                {unlockedBadges.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-uni-text-400 mb-2">Nenhum badge desbloqueado ainda.</p>
                    <a href="/conquistas" className="text-rose-500 font-bold text-sm">Ver conquistas disponíveis →</a>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {unlockedBadges.map((b: any) => (
                      <button
                        key={b.id}
                        onClick={() => setMissionPayload(p => ({ ...p, badgeId: b.id, note: b.name }))}
                        className={cn(
                          'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                          missionPayload.badgeId === b.id ? 'border-amber-400 bg-amber-50' : 'border-border-1 hover:border-amber-200'
                        )}
                      >
                        <span className="text-2xl">{b.icon}</span>
                        <span className="text-[10px] font-bold text-uni-text-600 text-center leading-tight">{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setActiveMission(null)}
                className="flex-1 py-2.5 rounded-xl border border-border-1 text-uni-text-600 font-bold text-sm hover:bg-cream-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={submitMission}
                disabled={
                  missionSubmitting ||
                  (activeMission.action === 'check_in' && !missionPayload.mood) ||
                  (activeMission.action === 'drink_water' && !missionPayload.glasses) ||
                  (activeMission.action === 'complete_challenge' && !missionPayload.challengeId && activeChallenges.length > 0) ||
                  (activeMission.action === 'update_semaforo' && !missionPayload.confirmed) ||
                  (activeMission.action === 'read_content' && (missionPayload.note?.trim().length ?? 0) < 10) ||
                  (activeMission.action === 'share_badge' && (!missionPayload.badgeId && unlockedBadges.length > 0))
                }
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {missionSubmitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {missionSubmitting ? 'Registrando...' : '✓ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Toast ── */}
      {showToast && unreadNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-border-1 shadow-2xl rounded-2xl p-4 flex items-start gap-3 max-w-xs animate-slideUp">
          <span className="text-2xl">🎉</span>
          <div className="flex-grow">
            <p className="font-bold text-uni-text-900 text-sm">{unreadNotification.title}</p>
            <p className="text-xs text-uni-text-500 mt-0.5">🔥 {unreadNotification.message}</p>
          </div>
          <button onClick={() => setShowToast(false)} className="text-uni-text-400 hover:text-uni-text-900 leading-none text-xl flex-shrink-0">×</button>
        </div>
      )}
    </div>
  );
}
