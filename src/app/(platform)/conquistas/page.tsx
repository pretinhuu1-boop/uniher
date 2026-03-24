'use client';

import { useState, useEffect } from 'react';
import { useCollaboratorBadges, useCollaboratorHome } from '@/hooks/useCollaborator';
import styles from './conquistas.module.css';
import { cn } from '@/lib/utils';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_CONFIG: Record<Rarity, { label: string; bg: string; border: string; glow: string; badge: string }> = {
  common:    { label: 'Comum',     bg: 'bg-gray-50',    border: 'border-gray-200',   glow: '',                           badge: 'bg-gray-100 text-gray-600' },
  rare:      { label: 'Raro',      bg: 'bg-blue-50',    border: 'border-blue-200',   glow: 'shadow-blue-100',            badge: 'bg-blue-100 text-blue-700' },
  epic:      { label: 'Épico',     bg: 'bg-violet-50',  border: 'border-violet-200', glow: 'shadow-violet-100',          badge: 'bg-violet-100 text-violet-700' },
  legendary: { label: 'Lendário',  bg: 'bg-amber-50',   border: 'border-amber-200',  glow: 'shadow-amber-200 shadow-md', badge: 'bg-amber-100 text-amber-700' },
};

const BADGE_REQUIREMENTS: Record<string, string> = {
  badge_iniciante:  'Faça seu primeiro check-in ou complete um desafio.',
  badge_streak7:    'Mantenha uma sequência de 7 dias consecutivos.',
  badge_preventiva: 'Registre 3 exames de saúde concluídos.',
  badge_streak30:   'Mantenha uma sequência de 30 dias consecutivos.',
  badge_mestra:     'Alcance o nível 10 na plataforma.',
  badge_maratonista:'Complete 50 desafios.',
  badge_equilibrio: 'Atinja pontuação ≥ 7 em todas as 6 dimensões de saúde.',
  default:          'Continue participando das campanhas e completando desafios.',
};

export default function ConquistasPage() {
  const { badges } = useCollaboratorBadges();
  const { data } = useCollaboratorHome();
  const [expandedBadge, setExpandedBadge] = useState<string | null>(null);
  const [sharedBadge, setSharedBadge] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const badgeList = badges as any[];
  const unlockedCount = badgeList.filter(b => b.unlockedAt || b.unlocked).length;
  const completionPct = badgeList.length > 0 ? Math.round((unlockedCount / badgeList.length) * 100) : 0;

  // Track newly unlocked badges (just unlocked in this session)
  useEffect(() => {
    const prev = new Set(JSON.parse(sessionStorage.getItem('knownBadges') || '[]'));
    const current = new Set(badgeList.filter(b => b.unlockedAt || b.unlocked).map((b: any) => b.id));
    const fresh = new Set([...current].filter(id => !prev.has(id)));
    if (fresh.size > 0) setNewlyUnlocked(fresh);
    sessionStorage.setItem('knownBadges', JSON.stringify([...current]));
  }, [badges]);

  const filteredBadges = badgeList.filter(b => {
    const isUnlocked = !!(b.unlockedAt || b.unlocked);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  const stats = [
    { label: 'Badges conquistados', value: `${unlockedCount}/${badgeList.length}`, icon: '🏆' },
    { label: 'Progresso geral', value: `${completionPct}%`, icon: '📈' },
    { label: 'Dias de sequência', value: (data as any)?.streakDays ?? 0, icon: '🔥' },
    { label: 'Pontos totais', value: ((data as any)?.points ?? 0).toLocaleString('pt-BR'), icon: '⭐' },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-8 font-body animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-uni-text-900">Conquistas</h1>
        <p className="text-uni-text-500 mt-1">Desbloqueie badges completando atividades e mantendo sua sequência.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-border-1 rounded-2xl p-5 shadow-sm">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-display font-bold text-uni-text-900">{s.value}</div>
            <div className="text-xs font-bold text-uni-text-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-uni-text-900">Coleção Completa</span>
          <span className="text-sm font-bold text-rose-500">{unlockedCount} de {badgeList.length}</span>
        </div>
        <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-700"
               style={{ width: `${completionPct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-uni-text-400">{completionPct}% concluído</span>
          <div className="flex items-center gap-3 text-xs">
            {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => (
              <span key={r} className={cn("px-2 py-0.5 rounded-full font-bold", RARITY_CONFIG[r].badge)}>{RARITY_CONFIG[r].label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Newly Unlocked banner */}
      {newlyUnlocked.size > 0 && (
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <div className="font-bold text-lg">Badge Desbloqueado!</div>
              <div className="text-rose-100 text-sm">
                {[...newlyUnlocked].map(id => badgeList.find((b: any) => b.id === id)?.name).filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'unlocked', 'locked'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              filter === f
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-white border border-border-1 text-uni-text-600 hover:border-rose-300"
            )}
          >
            {f === 'all' ? 'Todos' : f === 'unlocked' ? '✅ Desbloqueados' : '🔒 Bloqueados'}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge: any) => {
          const isUnlocked = !!(badge.unlockedAt || badge.unlocked);
          const isNew = newlyUnlocked.has(badge.id);
          const isExpanded = expandedBadge === badge.id;
          const rarity = (badge.rarity || 'common') as Rarity;
          const rc = RARITY_CONFIG[rarity];

          return (
            <div
              key={badge.id}
              onClick={() => setExpandedBadge(isExpanded ? null : badge.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedBadge(isExpanded ? null : badge.id); } }}
              className={cn(
                "relative border-2 rounded-2xl p-5 cursor-pointer transition-all select-none",
                isUnlocked
                  ? `${rc.bg} ${rc.border} ${rc.glow} hover:scale-[1.02]`
                  : "bg-gray-50 border-gray-100 opacity-60 grayscale hover:opacity-70",
                isNew && "ring-2 ring-rose-400 ring-offset-2 animate-pulse",
              )}
            >
              {/* Newly unlocked ribbon */}
              {isNew && (
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">NOVO!</div>
              )}

              <div className="flex items-start gap-4">
                {/* Badge icon */}
                <div className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border-2",
                  isUnlocked ? `${rc.bg} ${rc.border}` : "bg-gray-100 border-gray-200",
                  rarity === 'legendary' && isUnlocked && "shadow-lg shadow-amber-200"
                )}>
                  <span className={isUnlocked ? '' : 'grayscale opacity-50'}>{badge.icon}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-uni-text-900">{badge.name}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", rc.badge)}>{rc.label}</span>
                    {rarity === 'legendary' && <span className="text-xs">✨</span>}
                  </div>
                  <p className="text-xs text-uni-text-500 mt-1 line-clamp-2">{badge.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">⭐ {badge.points} pts</span>
                    {isUnlocked && badge.unlockedAt && (
                      <span className="text-[10px] text-uni-text-400" suppressHydrationWarning>
                        {new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">🔒 Bloqueado</span>
                    )}
                  </div>
                </div>

                <span className="text-uni-text-300 text-lg flex-shrink-0 mt-1">{isExpanded ? '▴' : '▾'}</span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3 animate-fadeIn">
                  <p className="text-sm text-uni-text-600">
                    {isUnlocked ? badge.description : (BADGE_REQUIREMENTS[badge.id] || BADGE_REQUIREMENTS.default)}
                  </p>
                  {!isUnlocked && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <span className="text-amber-500 flex-shrink-0">💡</span>
                      <p className="text-xs text-amber-700">
                        {BADGE_REQUIREMENTS[badge.id] || BADGE_REQUIREMENTS.default}
                      </p>
                    </div>
                  )}
                  {isUnlocked && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const text = `Conquistei o badge "${badge.name}" na UniHER!`;
                        const url = window.location.origin;
                        try {
                          if (navigator.share) {
                            await navigator.share({ title: text, text, url });
                          } else {
                            const waUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
                            window.open(waUrl, '_blank');
                          }
                          setSharedBadge(badge.id);
                          setTimeout(() => setSharedBadge(null), 2000);
                        } catch { /* user cancelled share */ }
                      }}
                      className={cn(
                        "text-xs font-bold px-4 py-2 rounded-xl transition-all",
                        sharedBadge === badge.id
                          ? "bg-emerald-500 text-white"
                          : "bg-white border border-rose-300 text-rose-500 hover:bg-rose-50"
                      )}
                    >
                      {sharedBadge === badge.id ? '✓ Compartilhado!' : '↗ Compartilhar conquista'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <span className="text-5xl block">🏆</span>
          <p className="font-bold text-uni-text-700">Nenhum badge encontrado</p>
          <p className="text-sm text-uni-text-400">Complete desafios e check-ins diários para desbloquear seu primeiro badge!</p>
        </div>
      )}
    </div>
  );
}
