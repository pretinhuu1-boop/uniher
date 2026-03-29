'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TIPS_DATA: Record<string, string[]> = {
  'Prevenção': ['Agende mamografia anual', 'Consulte ginecologista a cada 6 meses', 'Mantenha exames de sangue em dia'],
  'Sono': ['Evite telas 1h antes de dormir', 'Mantenha horário regular de sono'],
  'Energia': ['Faça pausas de 5 min a cada 2h', 'Hidrate-se com 2L de água por dia', 'Pratique alongamento entre reuniões'],
  'Saúde Mental': ['Continue com práticas de mindfulness', 'Reserve 10 min diários para respiração guiada'],
  'Hábitos': ['Mantenha a hidratação ao longo do dia', 'Inclua frutas e verduras em todas as refeições', 'Caminhe pelo menos 30 min por dia'],
  'Engajamento': ['Continue participando dos desafios semanais', 'Convide colegas para participar da plataforma'],
};

const SCORE_GUIDANCE: Record<string, { low: string; medium: string; high: string }> = {
  'Prevenção': {
    low: 'Agende um check-up preventivo. Exames em dia reduzem riscos!',
    medium: 'Bom progresso! Continue com exames regulares.',
    high: 'Excelente! Seus exames estão em dia. Continue assim!'
  },
  'Sono': {
    low: 'Tente dormir 7-8h por noite. Evite telas 1h antes de dormir.',
    medium: 'Seu sono está melhorando! Mantenha uma rotina regular.',
    high: 'Ótima qualidade de sono! Continue com hábitos saudáveis.'
  },
  'Energia': {
    low: 'Faça pausas ativas a cada 2h. Beba água regularmente.',
    medium: 'Boa energia! Adicione caminhadas curtas ao seu dia.',
    high: 'Energia excelente! Você está no caminho certo.'
  },
  'Saúde Mental': {
    low: 'Reserve 10 min diários para meditação ou respiração.',
    medium: 'Continue praticando autocuidado. Está fazendo diferença!',
    high: 'Saúde mental forte! Continue com suas práticas.'
  },
  'Hábitos': {
    low: 'Comece com 1 hábito novo por semana. Pequenos passos!',
    medium: 'Bons hábitos se formando! Mantenha a consistência.',
    high: 'Hábitos exemplares! Você é uma inspiração.'
  },
  'Engajamento': {
    low: 'Participe de 1 desafio ativo para aumentar seu engajamento.',
    medium: 'Bom engajamento! Explore as campanhas disponíveis.',
    high: 'Engajamento máximo! Continue participando ativamente.'
  }
};

function getScoreGuidance(dimension: string, score: number): string {
  const guidance = SCORE_GUIDANCE[dimension];
  if (!guidance) return '';
  if (score < 4) return guidance.low;
  if (score <= 7) return guidance.medium;
  return guidance.high;
}

function formatHistoryEntries(entries: { score: number; recorded_at: string }[]): string[] {
  return entries
    .slice(0, 4)
    .reverse()
    .map((e, i) => `Sem ${i + 1}: ${e.score.toFixed(1)}`);
}

type FilterType = 'all' | 'red' | 'yellow' | 'green';

const STATUS_CONFIG = {
  green:  { label: 'Saudável', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  yellow: { label: 'Atenção',  bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-400',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700'   },
  red:    { label: 'Urgente',  bg: 'bg-rose-50',     border: 'border-rose-200',    dot: 'bg-rose-500',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700'     },
};

export default function SemaforoPage() {
  const { data: apiData } = useSWR('/api/collaborator/semaforo', fetcher, { revalidateOnFocus: false });
  const { data: historyData } = useSWR('/api/collaborator/semaforo/history', fetcher, { revalidateOnFocus: false });
  const semaforoData: any[] = apiData ?? [];

  const greenCount  = semaforoData.filter(s => s.status === 'green').length;
  const yellowCount = semaforoData.filter(s => s.status === 'yellow').length;
  const redCount    = semaforoData.filter(s => s.status === 'red').length;

  const [expandedCard, setExpandedCard]     = useState<string | null>(null);
  const [activeFilter, setActiveFilter]     = useState<FilterType>('all');
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [currentReminders, setCurrentReminders] = useState<Record<string, boolean>>({});

  // Fetch current notification preferences
  useEffect(() => {
    fetch('/api/users/me/notification-preferences')
      .then(r => r.json())
      .then(d => {
        if (d?.prefs?.mission_reminders) setCurrentReminders(d.prefs.mission_reminders);
      })
      .catch(() => {});
  }, []);

  async function handleScheduleReminder(dimension: string) {
    const key = dimension.toLowerCase().replace(/\s/g, '_');
    setReminderFeedback(dimension);
    try {
      const updated = { ...currentReminders, [key]: true };
      await fetch('/api/users/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_reminders: updated }),
      });
      setCurrentReminders(updated);
    } catch { /* silently fail */ }
    setTimeout(() => setReminderFeedback(null), 2000);
  }

  // Stabilize dependency to prevent infinite loop
  const semaforoKey = JSON.stringify(semaforoData.map((d: any) => d.dimension + d.score));

  useEffect(() => {
    if (!semaforoData.length) return;
    const initial: Record<string, number> = {};
    semaforoData.forEach((item: any) => { initial[item.dimension] = 0; });
    setAnimatedScores(initial);

    let step = 0;
    const steps = 20;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      const next: Record<string, number> = {};
      semaforoData.forEach((item: any) => { next[item.dimension] = parseFloat((item.score * eased).toFixed(1)); });
      setAnimatedScores(next);
      if (step >= steps) clearInterval(timer);
    }, 800 / steps);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semaforoKey]);

  const filteredItems = semaforoData.filter(item =>
    activeFilter === 'all' || item.status === activeFilter
  );

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 font-body animate-fadeIn space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-bold text-uni-text-900">Semáforo de Saúde</h1>
        <p className="text-uni-text-500 mt-1">Acompanhe suas dimensões de saúde e bem-estar.</p>
      </div>

      {/* How it works */}
      <div className="bg-cream-100 border border-border-1 rounded-xl p-4">
        <p className="text-sm text-uni-text-600">
          <strong>Como funciona:</strong> Cada dimensão é avaliada de 0 a 10.{' '}
          <span className="text-red-500">Vermelho (&lt;4)</span> = atenção urgente,{' '}
          <span className="text-amber-500">Amarelo (4-7)</span> = melhorando,{' '}
          <span className="text-green-600">Verde (&gt;7)</span> = excelente.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {([
          { status: 'red',    count: redCount,    label: 'urgentes'           },
          { status: 'yellow', count: yellowCount,  label: 'precisam de atenção'},
          { status: 'green',  count: greenCount,   label: 'saudáveis'          },
        ] as { status: 'red'|'yellow'|'green', count: number, label: string }[]).map(({ status, count, label }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(activeFilter === status ? 'all' : status)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all",
                cfg.bg, cfg.border, cfg.text,
                activeFilter === status ? 'shadow-md scale-105' : 'opacity-80 hover:opacity-100'
              )}
            >
              <span className={cn("w-2.5 h-2.5 rounded-full", cfg.dot)} />
              {count} {label}
            </button>
          );
        })}
        {activeFilter !== 'all' && (
          <button onClick={() => setActiveFilter('all')} className="text-xs font-bold text-uni-text-400 hover:text-uni-text-700 px-3 py-2 rounded-full border border-border-1 transition-all">
            Limpar filtro
          </button>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredItems.map((item: any) => {
          const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.green;
          const isExpanded = expandedCard === item.dimension;
          const historyEntries = historyData?.[item.dimension];
          const detail = {
            history: historyEntries ? formatHistoryEntries(historyEntries) : [],
            tips: TIPS_DATA[item.dimension] || [],
          };
          const displayScore = animatedScores[item.dimension] ?? 0;

          return (
            <div
              key={item.dimension}
              onClick={() => setExpandedCard(isExpanded ? null : item.dimension)}
              className={cn(
                "bg-white rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden",
                cfg.border,
                isExpanded ? 'shadow-lg' : 'hover:shadow-md'
              )}
            >
              {/* Card top */}
              <div className={cn("p-5", cfg.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center text-xl shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-bold text-uni-text-900">{item.dimension}</div>
                      <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", cfg.badge)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-3xl font-display font-bold", cfg.text)}>
                      {displayScore.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-uni-text-400 font-medium">/10</div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="mt-4 h-1.5 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000", cfg.dot)}
                    style={{ width: `${(displayScore / 10) * 100}%` }}
                  />
                </div>
              </div>

              <div className="px-5 py-3">
                <p className="text-xs text-uni-text-500 leading-relaxed">{item.recommendation}</p>
                {getScoreGuidance(item.dimension, item.score) && (
                  <p className="text-xs text-uni-text-600 mt-2 bg-cream-50 border border-border-1 rounded-lg px-3 py-2">
                    {getScoreGuidance(item.dimension, item.score)}
                  </p>
                )}
                <div className={cn("mt-2 text-xs font-bold transition-all flex items-center gap-1", cfg.text)}>
                  {isExpanded ? '▲ Ver menos' : '▾ Ver detalhes e dicas'}
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (detail.history.length > 0 || detail.tips.length > 0) && (
                <div
                  className="border-t border-border-1 px-5 py-4 space-y-4 bg-gray-50/50"
                  onClick={e => e.stopPropagation()}
                >
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-uni-text-400 mb-2">📊 Histórico</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {detail.history.map((entry, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-uni-text-600">
                          <span className="font-bold">{entry}</span>
                          {i < detail.history.length - 1 && <span className="text-uni-text-300">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-uni-text-400 mb-2">💡 Dicas personalizadas</h4>
                    <ul className="space-y-1">
                      {detail.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-uni-text-600 flex items-start gap-2">
                          <span className="text-uni-green mt-0.5">✓</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {reminderFeedback === item.dimension ? (
                    <p className="text-xs font-bold text-emerald-600">✓ Lembrete agendado!</p>
                  ) : (
                    <button
                      onClick={() => handleScheduleReminder(item.dimension)}
                      className="text-xs font-bold text-uni-text-500 border border-border-1 rounded-lg px-4 py-2 hover:border-rose-300 hover:text-rose-500 transition-all"
                    >
                      🔔 Agendar lembrete
                    </button>
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
