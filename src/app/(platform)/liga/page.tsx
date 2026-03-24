'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type League = 'bronze' | 'prata' | 'ouro' | 'safira' | 'rubi' | 'esmeralda' | 'diamante';

const LEAGUE_META: Record<League, { label: string; color: string; bg: string; icon: string }> = {
  bronze:    { label: 'Bronze',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: '🥉' },
  prata:     { label: 'Prata',     color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     icon: '🥈' },
  ouro:      { label: 'Ouro',      color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: '🥇' },
  safira:    { label: 'Safira',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: '💎' },
  rubi:      { label: 'Rubi',      color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',     icon: '♦️' },
  esmeralda: { label: 'Esmeralda', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',icon: '💚' },
  diamante:  { label: 'Diamante',  color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200',     icon: '💠' },
};

const LEAGUES: League[] = ['bronze', 'prata', 'ouro', 'safira', 'rubi', 'esmeralda', 'diamante'];

interface LeagueEntry {
  rank: number; user_id: string; name: string; avatar_url: string | null;
  week_points: number; league: League;
}

interface LeagueStatus {
  currentLeague: League; rank: number; weekPoints: number;
  totalInLeague: number; promoteZone: boolean; relegateZone: boolean;
  weekStart: string;
  meta: { label: string; color: string; icon: string };
}

interface CustomLeague {
  id: string; name: string; description: string | null;
  type: 'opt_in' | 'department' | 'company';
  icon: string; color: string; is_active: number;
  member_count: number; is_member: boolean; my_week_points: number;
}

export default function LigaPage() {
  const [status, setStatus] = useState<LeagueStatus | null>(null);
  const [ranking, setRanking] = useState<LeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLeague, setViewLeague] = useState<League | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [customLeagues, setCustomLeagues] = useState<CustomLeague[]>([]);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('uniher_liga_explanation_dismissed') !== 'true';
    }
    return true;
  });

  useEffect(() => {
    // Get current user
    fetch('/api/users/me').then(r => r.json()).then(d => setMyUserId(d.user?.id)).catch(() => {});

    fetch('/api/gamification/league')
      .then(r => r.json())
      .then(d => {
        setStatus(d.status);
        setRanking(d.ranking || []);
        setViewLeague(d.status?.currentLeague || 'bronze');
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/collaborator/leagues')
      .then(r => r.json())
      .then(d => setCustomLeagues(d.leagues || []))
      .catch(() => {});
  }, []);

  async function loadLeague(league: League) {
    setViewLeague(league);
    try {
      const res = await fetch(`/api/gamification/leaderboard?type=league&league=${league}`);
      const d = await res.json();
      if (d.ranking) setRanking(d.ranking);
    } catch { /* noop */ }
  }

  async function toggleJoin(league: CustomLeague) {
    setJoinLoading(league.id);
    try {
      const method = league.is_member ? 'DELETE' : 'POST';
      const res = await fetch(`/api/rh/leagues/${league.id}/join`, { method });
      const d = await res.json();
      if (d.success) {
        setCustomLeagues(prev => prev.map(l => l.id === league.id ? { ...l, is_member: !l.is_member, member_count: l.member_count + (l.is_member ? -1 : 1) } : l));
      }
    } catch { /* noop */ }
    setJoinLoading(null);
  }

  const currentMeta = viewLeague ? LEAGUE_META[viewLeague] : null;
  const isMyLeague = viewLeague === status?.currentLeague;

  const promoteCount = 10;
  const relegateCount = 5;

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 space-y-6 font-body animate-fadeIn">
      {/* Explanation Banner */}
      {showExplanation && (
        <div className="bg-gradient-to-r from-amber-50 to-cream-100 border border-amber-200 rounded-xl p-4 mb-6 relative">
          <button
            onClick={() => {
              setShowExplanation(false);
              localStorage.setItem('uniher_liga_explanation_dismissed', 'true');
            }}
            className="absolute top-2 right-2 text-uni-text-400 hover:text-uni-text-600 text-lg transition-colors"
            aria-label="Fechar explicação"
          >
            ×
          </button>
          <h3 className="font-bold text-uni-text-800 mb-2">Como funcionam as Ligas?</h3>
          <ul className="text-sm text-uni-text-600 space-y-1">
            <li>Complete desafios e check-ins para ganhar pontos semanais</li>
            <li><span className="text-green-600 font-medium">Top 10</span> da sua liga sobem para a próxima</li>
            <li><span className="text-red-500 font-medium">Últimos 5</span> descem uma liga</li>
            <li>As ligas resetam toda segunda-feira</li>
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-uni-text-900">Liga Semanal</h1>
          <p className="text-uni-text-500 mt-1">Compita com outras colaboradoras e suba de liga!</p>
        </div>
        {status && (
          <div className={cn("flex items-center gap-3 border rounded-2xl px-5 py-3", currentMeta?.bg)}>
            <span className="text-3xl">{status.meta.icon}</span>
            <div>
              <div className={cn("font-bold text-sm", currentMeta?.color)}>Minha Liga: {status.meta.label}</div>
              <div className="text-xs text-uni-text-500">#{status.rank} • {status.weekPoints} pts esta semana</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {status && isMyLeague && (
        <div className={cn(
          "rounded-2xl p-4 border-2 flex items-center gap-4",
          status.promoteZone ? "bg-emerald-50 border-emerald-200" :
          status.relegateZone ? "bg-red-50 border-red-200" :
          "bg-amber-50 border-amber-100"
        )}>
          <span className="text-2xl flex-shrink-0">
            {status.promoteZone ? '🚀' : status.relegateZone ? '⚠️' : '🛡️'}
          </span>
          <div>
            <div className={cn("font-bold text-sm",
              status.promoteZone ? "text-emerald-700" :
              status.relegateZone ? "text-red-700" : "text-amber-700"
            )}>
              {status.promoteZone ? `Zona de Promoção — Top ${promoteCount}! Continue assim!` :
               status.relegateZone ? 'Zona de Rebaixamento — Ganhe mais pontos esta semana!' :
               'Zona Segura — Você está bem posicionada.'}
            </div>
            <div className="text-xs text-uni-text-500 mt-0.5">
              Você está em #{status.rank} de {status.totalInLeague} na liga {status.meta.label} •{' '}
              {status.weekStart && `Semana de ${new Date(status.weekStart).toLocaleDateString('pt-BR')}`}
            </div>
          </div>
        </div>
      )}

      {/* League Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {LEAGUES.map(league => {
          const meta = LEAGUE_META[league];
          const isSelected = viewLeague === league;
          const isMine = league === status?.currentLeague;
          return (
            <button
              key={league}
              onClick={() => loadLeague(league)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all",
                isSelected ? `${meta.bg} ${meta.color} scale-105 shadow-sm` : "bg-white border-border-1 text-uni-text-600 hover:border-rose-200"
              )}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              {isMine && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            </button>
          );
        })}
      </div>

      {/* Ranking */}
      <div className="bg-white border border-border-1 rounded-2xl shadow-sm overflow-hidden">
        <div className={cn("p-5 border-b border-border-1 flex items-center gap-3", currentMeta?.bg)}>
          <span className="text-2xl">{currentMeta?.icon}</span>
          <div>
            <h2 className={cn("font-bold text-lg", currentMeta?.color)}>Liga {currentMeta?.label}</h2>
            <p className="text-xs text-uni-text-500">{ranking.length} participantes esta semana</p>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 bg-cream-50 border-b border-border-1 flex items-center gap-4 text-[11px] text-uni-text-400 font-bold">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Top {promoteCount} → Promoção</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Últimos {relegateCount} → Rebaixamento</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-uni-text-400">Carregando ranking...</div>
        ) : ranking.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-uni-text-500 font-bold">Nenhuma colaboradora nesta liga ainda.</p>
            <p className="text-xs text-uni-text-400 mt-1">Ganhe pontos para aparecer no ranking!</p>
          </div>
        ) : (
          <div className="divide-y divide-border-1">
            {ranking.map((entry) => {
              const isMe = entry.user_id === myUserId;
              const isPromoZone = entry.rank <= promoteCount;
              const isRelegateZone = entry.rank > ranking.length - relegateCount && relegateCount > 0;

              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 transition-colors",
                    isMe ? "bg-rose-50" : "hover:bg-cream-50",
                    isPromoZone && !isMe && "border-l-2 border-emerald-400",
                    isRelegateZone && !isMe && "border-l-2 border-red-300",
                    isMe && "border-l-4 border-rose-500"
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0",
                    entry.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                    entry.rank === 2 ? "bg-gray-100 text-gray-600" :
                    entry.rank === 3 ? "bg-amber-100 text-amber-700" :
                    isPromoZone ? "bg-emerald-50 text-emerald-600" :
                    isRelegateZone ? "bg-red-50 text-red-500" :
                    "bg-cream-100 text-uni-text-500"
                  )}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    isMe ? "bg-rose-500 text-white" : "bg-cream-100 text-uni-text-600"
                  )}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt={entry.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : entry.name?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className={cn("font-bold text-sm truncate", isMe ? "text-rose-600" : "text-uni-text-900")}>
                      {entry.name} {isMe && <span className="text-xs font-normal text-rose-400">(você)</span>}
                    </div>
                    {isPromoZone && entry.rank <= promoteCount && (
                      <div className="text-[10px] text-emerald-600 font-bold">↑ Zona de Promoção</div>
                    )}
                    {isRelegateZone && (
                      <div className="text-[10px] text-red-500 font-bold">↓ Zona de Rebaixamento</div>
                    )}
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-uni-text-900">{entry.week_points.toLocaleString('pt-BR')}</div>
                    <div className="text-[10px] text-uni-text-400">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How leagues work */}
      <div className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-uni-text-900 mb-4">Como as Ligas Funcionam</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📅', title: 'Semana reinicia', desc: 'Toda segunda-feira os pontos semanais são zerados.' },
            { icon: '🚀', title: 'Promoção', desc: `Top ${promoteCount} colaboradoras sobem para a liga acima ao final da semana.` },
            { icon: '⚠️', title: 'Rebaixamento', desc: `As ${relegateCount} últimas descem para a liga abaixo.` },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div>
                <div className="font-bold text-uni-text-900 text-sm">{item.title}</div>
                <div className="text-xs text-uni-text-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Leagues */}
      {customLeagues.length > 0 && (
        <div className="bg-white border border-border-1 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border-1">
            <h2 className="font-bold text-uni-text-900 text-lg">Ligas da Empresa</h2>
            <p className="text-xs text-uni-text-400 mt-0.5">Ligas criadas pelo RH. Participe das opt-in para competir!</p>
          </div>
          <div className="divide-y divide-border-1">
            {customLeagues.map(l => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-4 hover:bg-cream-50 transition-colors flex-wrap">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border-2"
                     style={{ borderColor: l.color + '40', backgroundColor: l.color + '15' }}>
                  {l.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-uni-text-900 text-sm">{l.name}</h3>
                    <span className="text-[10px] bg-cream-100 text-uni-text-500 font-bold px-2 py-0.5 rounded-full">
                      {l.type === 'opt_in' ? 'Opt-in' : l.type === 'department' ? 'Setor' : 'Empresa'}
                    </span>
                    {l.is_member && <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full">✔ Participando</span>}
                  </div>
                  {l.description && <p className="text-xs text-uni-text-400 mt-0.5 truncate">{l.description}</p>}
                  <p className="text-xs text-uni-text-400 mt-0.5">
                    👥 {l.member_count} membro{l.member_count !== 1 ? 's' : ''}
                    {l.is_member && l.my_week_points > 0 && ` • ${l.my_week_points} pts esta semana`}
                  </p>
                </div>
                {l.type === 'opt_in' && (
                  <button
                    onClick={() => toggleJoin(l)}
                    disabled={joinLoading === l.id}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      l.is_member
                        ? "border border-red-200 text-red-500 hover:bg-red-50"
                        : "bg-rose-500 text-white hover:bg-rose-600"
                    )}
                  >
                    {joinLoading === l.id ? '...' : l.is_member ? 'Sair' : 'Participar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* League progression path */}
      <div className="bg-white border border-border-1 rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-uni-text-900 mb-4">Caminho das Ligas</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {LEAGUES.map((league, i) => {
            const meta = LEAGUE_META[league];
            const isActive = league === status?.currentLeague;
            const isPast = LEAGUES.indexOf(league) < LEAGUES.indexOf(status?.currentLeague || 'bronze');
            return (
              <div key={league} className="flex items-center flex-shrink-0">
                <div className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 min-w-[72px] transition-all",
                  isActive ? `${meta.bg} border-current scale-105 shadow-sm` :
                  isPast ? "bg-cream-50 border-border-1 opacity-60" :
                  "bg-white border-border-1 opacity-40"
                )}>
                  <span className="text-2xl">{meta.icon}</span>
                  <span className={cn("text-xs font-bold", isActive ? meta.color : "text-uni-text-500")}>{meta.label}</span>
                  {isActive && <span className="text-[9px] text-rose-500 font-bold">VOCÊ</span>}
                </div>
                {i < LEAGUES.length - 1 && (
                  <div className={cn("w-6 h-0.5 mx-1", isPast ? "bg-rose-400" : "bg-cream-100")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
