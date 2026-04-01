'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TIPS_DATA: Record<string, string[]> = {
  'Prevencao': ['Agende mamografia anual', 'Consulte ginecologista a cada 6 meses', 'Mantenha exames de sangue em dia'],
  'Sono': ['Evite telas 1h antes de dormir', 'Mantenha horario regular de sono'],
  'Energia': ['Faca pausas de 5 min a cada 2h', 'Hidrate-se com 2L de agua por dia', 'Pratique alongamento entre reunioes'],
  'Saude Mental': ['Continue com praticas de mindfulness', 'Reserve 10 min diarios para respiracao guiada'],
  'Habitos': ['Mantenha a hidratacao ao longo do dia', 'Inclua frutas e verduras em todas as refeicoes', 'Caminhe pelo menos 30 min por dia'],
  'Engajamento': ['Continue participando dos desafios semanais', 'Convide colegas para participar da plataforma'],
};

const SCORE_GUIDANCE: Record<string, { low: string; medium: string; high: string }> = {
  'Prevencao': {
    low: 'Agende um check-up preventivo. Exames em dia reduzem riscos!',
    medium: 'Bom progresso! Continue com exames regulares.',
    high: 'Excelente! Seus exames estao em dia. Continue assim!'
  },
  'Sono': {
    low: 'Tente dormir 7-8h por noite. Evite telas 1h antes de dormir.',
    medium: 'Seu sono esta melhorando! Mantenha uma rotina regular.',
    high: 'Otima qualidade de sono! Continue com habitos saudaveis.'
  },
  'Energia': {
    low: 'Faca pausas ativas a cada 2h. Beba agua regularmente.',
    medium: 'Boa energia! Adicione caminhadas curtas ao seu dia.',
    high: 'Energia excelente! Voce esta no caminho certo.'
  },
  'Saude Mental': {
    low: 'Reserve 10 min diarios para meditacao ou respiracao.',
    medium: 'Continue praticando autocuidado. Esta fazendo diferenca!',
    high: 'Saude mental forte! Continue com suas praticas.'
  },
  'Habitos': {
    low: 'Comece com 1 habito novo por semana. Pequenos passos!',
    medium: 'Bons habitos se formando! Mantenha a consistencia.',
    high: 'Habitos exemplares! Voce e uma inspiracao.'
  },
  'Engajamento': {
    low: 'Participe de 1 desafio ativo para aumentar seu engajamento.',
    medium: 'Bom engajamento! Explore as campanhas disponiveis.',
    high: 'Engajamento maximo! Continue participando ativamente.'
  }
};

function normalizeDimensionKey(input: string): string {
  const cleaned = input
    .replace(/Ã§/g, 'c')
    .replace(/Ã£/g, 'a')
    .replace(/Ã¡|Ã¢|Ã /g, 'a')
    .replace(/Ã©|Ãª/g, 'e')
    .replace(/Ã­/g, 'i')
    .replace(/Ã³|Ã´|Ãµ/g, 'o')
    .replace(/Ãº/g, 'u')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();

  if (cleaned.includes('preven')) return 'Prevencao';
  if (cleaned.includes('saude mental') || cleaned.includes('mental')) return 'Saude Mental';
  if (cleaned.includes('habito')) return 'Habitos';
  if (cleaned.includes('sono')) return 'Sono';
  if (cleaned.includes('energia')) return 'Energia';
  if (cleaned.includes('engaj')) return 'Engajamento';
  return input;
}

function getScoreGuidance(dimension: string, score: number): string {
  const guidance = SCORE_GUIDANCE[normalizeDimensionKey(dimension)];
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

function getLocalDateValue(base = new Date()): string {
  const year = base.getFullYear();
  const month = `${base.getMonth() + 1}`.padStart(2, '0');
  const day = `${base.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type FilterType = 'all' | 'red' | 'yellow' | 'green';

const STATUS_CONFIG = {
  green:  { label: 'Saudavel', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  yellow: { label: 'Atencao',  bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-400',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700'   },
  red:    { label: 'Urgente',  bg: 'bg-rose-50',     border: 'border-rose-200',    dot: 'bg-rose-500',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700'     },
};

export default function SemaforoPage() {
  const searchParams = useSearchParams();
  const { data: apiData } = useSWR('/api/collaborator/semaforo', fetcher, { revalidateOnFocus: false });
  const { data: historyData } = useSWR('/api/collaborator/semaforo/history', fetcher, { revalidateOnFocus: false });
  const semaforoData: any[] = apiData ?? [];

  const greenCount  = semaforoData.filter(s => s.status === 'green').length;
  const yellowCount = semaforoData.filter(s => s.status === 'yellow').length;
  const redCount    = semaforoData.filter(s => s.status === 'red').length;

  const [expandedCard, setExpandedCard]     = useState<string | null>(null);
  const [activeFilter, setActiveFilter]     = useState<FilterType>('all');
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});
  const [reminderFeedback, setReminderFeedback] = useState<Record<string, string>>({});
  const [currentReminders, setCurrentReminders] = useState<Record<string, boolean>>({});
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDimension, setReminderDimension] = useState('');
  const [reminderDate, setReminderDate] = useState(getLocalDateValue());
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderError, setReminderError] = useState('');
  const [reminderSaving, setReminderSaving] = useState(false);

  // Fetch current notification preferences
  useEffect(() => {
    fetch('/api/users/me/notification-preferences')
      .then(r => r.json())
      .then(d => {
        if (d?.prefs?.mission_reminders) setCurrentReminders(d.prefs.mission_reminders);
      })
      .catch(() => {});
  }, []);

  function openReminderModal(dimension: string) {
    setReminderDimension(dimension);
    setReminderDate(getLocalDateValue());
    setReminderTime('08:00');
    setReminderError('');
    setReminderModalOpen(true);
  }

  function closeReminderModal(force = false) {
    if (reminderSaving && !force) return;
    setReminderModalOpen(false);
    setReminderDimension('');
    setReminderDate(getLocalDateValue());
    setReminderTime('08:00');
    setReminderError('');
  }

  function isValidTime(value: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(value)) return false;
    const [hh, mm] = value.split(':').map(Number);
    return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
  }

  async function handleScheduleReminder() {
    const dimension = reminderDimension;
    const date = reminderDate.trim();
    const time = reminderTime.trim();

    if (!dimension) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setReminderError('Escolha uma data valida para o lembrete.');
      return;
    }
    if (!isValidTime(time)) {
      setReminderError('Horario invalido. Use HH:MM (ex: 08:00).');
      return;
    }

    setReminderSaving(true);
    setReminderError('');

    const scheduled = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduled.getTime())) {
      setReminderError('Nao foi possivel interpretar a data e o horario escolhidos.');
      setReminderSaving(false);
      return;
    }

    try {
      const eventRes = await fetch('/api/collaborator/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Lembrete de ${dimension}`,
          type: 'lembrete',
          date,
          time,
          notes: `Lembrete criado no Semaforo de Saude para acompanhar ${dimension}.`,
        }),
      });

      if (!eventRes.ok) {
        setReminderError('Nao foi possivel agendar agora. Tente novamente.');
        setReminderSaving(false);
        return;
      }

      const updated = { ...currentReminders, update_semaforo: true };
      await fetch('/api/users/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_reminders: updated }),
      });
      setCurrentReminders(updated);
      setReminderFeedback(prev => ({ ...prev, [dimension]: `Lembrete agendado para ${scheduled.toLocaleDateString('pt-BR')} as ${time}.` }));
      closeReminderModal(true);
    } catch {
      setReminderError('Falha de conexao ao agendar. Verifique a internet e tente novamente.');
    } finally {
      setReminderSaving(false);
    }

    setTimeout(() => setReminderFeedback(prev => ({ ...prev, [dimension]: '' })), 3000);
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

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus || !semaforoData.length) return;

    const target = semaforoData.find((item: any) => normalizeDimensionKey(item.dimension) === normalizeDimensionKey(focus));
    if (!target) return;

    setExpandedCard(target.dimension);
    const timer = window.setTimeout(() => {
      const cards = Array.from(document.querySelectorAll('[data-semaforo-dimension]')) as HTMLElement[];
      const card = cards.find((element) => normalizeDimensionKey(element.dataset.semaforoDimension || '') === normalizeDimensionKey(target.dimension));
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [searchParams, semaforoData]);

  const filteredItems = semaforoData.filter(item =>
    activeFilter === 'all' || item.status === activeFilter
  );

  return (
    <div className="min-h-screen bg-cream-50 p-6 md:p-10 font-body animate-fadeIn space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-bold text-uni-text-900">Semaforo de Saude</h1>
        <p className="text-uni-text-500 mt-1">Acompanhe suas dimensoes de saude e bem-estar.</p>
      </div>

      {/* How it works */}
      <div className="bg-cream-100 border border-border-1 rounded-xl p-4">
        <p className="text-sm text-uni-text-600">
          <strong>Como funciona:</strong> Cada dimensao e avaliada de 0 a 10.{' '}
          <span className="text-red-500">Vermelho (&lt;4)</span> = atencao urgente,{' '}
          <span className="text-amber-500">Amarelo (4-7)</span> = melhorando,{' '}
          <span className="text-green-600">Verde (&gt;7)</span> = excelente.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {([
          { status: 'red',    count: redCount,    label: 'urgentes'           },
          { status: 'yellow', count: yellowCount,  label: 'precisam de atencao'},
          { status: 'green',  count: greenCount,   label: 'saudaveis'          },
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
          const normalizedDimension = normalizeDimensionKey(item.dimension);
          const detail = {
            history: historyEntries ? formatHistoryEntries(historyEntries) : [],
            tips: TIPS_DATA[normalizedDimension] || [],
          };
          const displayScore = animatedScores[item.dimension] ?? 0;

          return (
            <div
              key={item.dimension}
              data-semaforo-dimension={item.dimension}
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
                {getScoreGuidance(normalizedDimension, item.score) && (
                  <p className="text-xs text-uni-text-600 mt-2 bg-cream-50 border border-border-1 rounded-lg px-3 py-2">
                    {getScoreGuidance(normalizedDimension, item.score)}
                  </p>
                )}
                <div className={cn("mt-2 text-xs font-bold transition-all flex items-center gap-1", cfg.text)}>
                  {isExpanded ? '^ Ver menos' : 'v Ver detalhes e dicas'}
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (detail.history.length > 0 || detail.tips.length > 0) && (
                <div
                  className="border-t border-border-1 px-5 py-4 space-y-4 bg-gray-50/50"
                  onClick={e => e.stopPropagation()}
                >
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-uni-text-400 mb-2">Historico</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {detail.history.map((entry, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-uni-text-600">
                          <span className="font-bold">{entry}</span>
                          {i < detail.history.length - 1 && <span className="text-uni-text-300">{'->'}</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-uni-text-400 mb-2">Dicas personalizadas</h4>
                    <ul className="space-y-1">
                      {detail.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-uni-text-600 flex items-start gap-2">
                          <span className="text-uni-green mt-0.5">OK</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {reminderFeedback[item.dimension] ? (
                    <p className="text-xs font-bold text-emerald-600">{reminderFeedback[item.dimension]}</p>
                  ) : (
                    <button
                      onClick={() => openReminderModal(item.dimension)}
                      className="text-xs font-bold text-uni-text-500 border border-border-1 rounded-lg px-4 py-2 hover:border-rose-300 hover:text-rose-500 transition-all"
                    >
                      Agendar lembrete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={reminderModalOpen}
        onClose={closeReminderModal}
        title="Agendar lembrete"
      >
        <div className="space-y-4">
          <p className="text-sm text-uni-text-600">
            Escolha a data e o horario para receber lembrete de <strong>{reminderDimension}</strong>.
          </p>

          <Input
            label="Data"
            type="date"
            value={reminderDate}
            onChange={(e) => {
              setReminderDate(e.target.value);
              if (reminderError) setReminderError('');
            }}
            aria-label="Data do lembrete"
          />

          <Input
            label="Horario"
            type="time"
            value={reminderTime}
            onChange={(e) => {
              setReminderTime(e.target.value);
              if (reminderError) setReminderError('');
            }}
            error={reminderError || undefined}
            aria-label="Horario do lembrete"
          />

          <p className="text-xs text-uni-text-400">
            O lembrete sera criado na sua agenda pessoal e, perto do horario, pode aparecer como popup e notificacao no app instalado.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => closeReminderModal()}
              disabled={reminderSaving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border-1 text-sm font-semibold text-uni-text-600 hover:bg-cream-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleScheduleReminder}
              disabled={reminderSaving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gold-500 text-white text-sm font-semibold hover:bg-gold-600 transition-all disabled:opacity-50"
            >
              {reminderSaving ? 'Salvando...' : 'Confirmar lembrete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

