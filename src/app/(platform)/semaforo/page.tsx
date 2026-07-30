'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  Battery,
  CheckCircle2,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
} from 'lucide-react';
import PageHeader from '@/components/platform/PageHeader';
import AuthenticatedSemaforoQuiz from '@/components/quiz/AuthenticatedSemaforoQuiz';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { cn } from '@/lib/utils';

type Dimension = 'prevention' | 'sleep' | 'energy' | 'mind' | 'habits' | 'connection';
type Signal = 'green' | 'yellow' | 'red';
type Energy = 'low' | 'steady' | 'high';

interface SemaforoEntry {
  id: string;
  dimension: Dimension;
  dimensionLabel: string;
  dimensionPrompt: string;
  icon: string;
  signal: Signal;
  signalLabel: string;
  tone: Signal;
  guide: string;
  energy: Energy;
  energyLabel: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
}

interface SemaforoDimension {
  id: Dimension;
  label: string;
  icon: string;
  prompt: string;
  greenGuide: string;
  yellowGuide: string;
  redGuide: string;
  latest: SemaforoEntry | null;
}

interface SemaforoState {
  status: 'private_self_report';
  diagnostic: false;
  companyVisible: false;
  consent: {
    accepted: boolean;
    version: string;
    acceptedAt?: string;
    retentionDays: number;
  };
  dimensions: SemaforoDimension[];
  latest: SemaforoEntry | null;
}

interface SemaforoHistory {
  entries: SemaforoEntry[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Falha ao carregar o Semáforo privado.');
  return response.json();
};

const iconByName = {
  ShieldCheck,
  Moon,
  Battery,
  HeartPulse,
  Sprout,
  Sparkles,
} as const;

const signalOptions: Array<{ value: Signal; title: string; body: string; short: string }> = [
  {
    value: 'green',
    title: 'Estou bem',
    short: 'Bem',
    body: 'Sinal verde para manter o cuidado que já funciona.',
  },
  {
    value: 'yellow',
    title: 'Preciso observar',
    short: 'Observar',
    body: 'Sinal amarelo para acompanhar com gentileza.',
  },
  {
    value: 'red',
    title: 'Preciso de apoio',
    short: 'Apoio',
    body: 'Sinal vermelho para priorizar cuidado e suporte.',
  },
];

const energyOptions: Array<{ value: Energy; label: string }> = [
  { value: 'low', label: 'Baixa' },
  { value: 'steady', label: 'Estável' },
  { value: 'high', label: 'Alta' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function signalClass(signal: Signal) {
  if (signal === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (signal === 'yellow') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-rose-200 bg-rose-50 text-rose-800';
}

function signalAccent(signal: Signal | null) {
  if (signal === 'green') return 'bg-emerald-500';
  if (signal === 'yellow') return 'bg-amber-400';
  if (signal === 'red') return 'bg-rose-500';
  return 'bg-[var(--platform-line)]';
}

function signalLabel(signal: Signal | null) {
  if (signal === 'green') return 'Verde';
  if (signal === 'yellow') return 'Amarelo';
  if (signal === 'red') return 'Vermelho';
  return 'Pendente';
}

export default function SemaforoPage() {
  const { data, error, isLoading, mutate } = useSWR<SemaforoState>('/api/collaborator/semaforo', fetcher);
  const { data: history, mutate: mutateHistory } = useSWR<SemaforoHistory>('/api/collaborator/semaforo/history?limit=18', fetcher);
  const [activeDimension, setActiveDimension] = useState<Dimension>('prevention');
  const [signal, setSignal] = useState<Signal>('green');
  const [energy, setEnergy] = useState<Energy>('steady');
  const [note, setNote] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const dimensions = data?.dimensions ?? [];
  const selectedDimension = dimensions.find((dimension) => dimension.id === activeDimension) ?? dimensions[0];
  const completedDimensions = dimensions.filter((dimension) => dimension.latest).length;
  const activeSignal = useMemo(
    () => signalOptions.find((option) => option.value === signal) ?? signalOptions[0],
    [signal],
  );

  async function submit() {
    if (!selectedDimension) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/collaborator/semaforo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          consentAccepted: accepted,
          dimension: selectedDimension.id,
          signal,
          energy,
          note,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(body?.error || 'Não foi possível salvar agora.');
        return;
      }
      setNote('');
      setAccepted(true);
      setMessage(`${selectedDimension.label}: registro privado salvo.`);
      await mutate(body, { revalidate: true });
      await mutateHistory();
    } finally {
      setSaving(false);
    }
  }

  async function erase() {
    if (!window.confirm('Apagar todos os seus registros privados do Semáforo?')) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/collaborator/semaforo', { method: 'DELETE' });
      if (!response.ok) {
        setMessage('Não foi possível apagar agora.');
        return;
      }
      setAccepted(false);
      setMessage('Registros apagados e consentimento revogado.');
      await mutate();
      await mutateHistory();
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <FeedbackState kind="loading" title="Carregando Semáforo" description="Preparando seu espaço privado." />;
  }

  if (error || !data || !selectedDimension) {
    return <FeedbackState kind="error" title="Semáforo indisponível" description="Tente novamente em instantes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Saúde primária"
        title="Semáforo da Saúde"
        description="Quiz de perfil, resultado por dimensão e auto-relato privado, sem acesso individual por empresa."
      />

      <AuthenticatedSemaforoQuiz />

      <section className="overflow-hidden rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                  Circuito de autocuidado
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--platform-ink)]">
                  {completedDimensions} de {dimensions.length} dimensões registradas
                </h2>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--platform-line)] px-3 py-2 text-xs font-semibold text-[var(--platform-muted)]">
                <ShieldCheck size={15} aria-hidden="true" />
                Só você vê
              </span>
            </div>

            <div className="mt-5 grid grid-cols-6 gap-2" aria-label="Sinais registrados no Semáforo">
              {dimensions.map((dimension) => (
                <button
                  key={dimension.id}
                  type="button"
                  onClick={() => {
                    setActiveDimension(dimension.id);
                    if (dimension.latest) {
                      setSignal(dimension.latest.signal);
                      setEnergy(dimension.latest.energy);
                    }
                  }}
                  className={cn(
                    'h-12 rounded-[var(--platform-radius-control)] border transition',
                    activeDimension === dimension.id
                      ? 'border-[var(--platform-action)] bg-[var(--platform-group)]'
                      : 'border-[var(--platform-line)] bg-white hover:border-[var(--platform-action)]',
                  )}
                  title={`${dimension.label}: ${signalLabel(dimension.latest?.signal ?? null)}`}
                >
                  <span className={cn('mx-auto block h-2 w-8 rounded-full', signalAccent(dimension.latest?.signal ?? null))} />
                  <span className="sr-only">{dimension.label}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className="border-t border-[var(--platform-line)] bg-[var(--platform-group)] p-5 lg:border-l lg:border-t-0 sm:p-6">
            <p className="text-xs font-semibold uppercase text-[var(--platform-muted)]">Último sinal</p>
            {data.latest ? (
              <div className="mt-3 space-y-2">
                <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', signalClass(data.latest.signal))}>
                  {data.latest.dimensionLabel}: {data.latest.signalLabel}
                </span>
                <p className="text-sm text-[var(--platform-muted)]">Energia: {data.latest.energyLabel}</p>
                <p className="text-xs text-[var(--platform-muted)]">Registrado em {formatDate(data.latest.createdAt)}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--platform-muted)]">Nenhum sinal salvo ainda.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Escolher dimensão</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {dimensions.map((dimension) => {
              const Icon = iconByName[dimension.icon as keyof typeof iconByName] ?? ShieldCheck;
              const latestSignal = dimension.latest?.signal ?? null;
              return (
                <button
                  key={dimension.id}
                  type="button"
                  onClick={() => {
                    setActiveDimension(dimension.id);
                    if (dimension.latest) {
                      setSignal(dimension.latest.signal);
                      setEnergy(dimension.latest.energy);
                    }
                  }}
                  className={cn(
                    'min-h-32 rounded-[var(--platform-radius-control)] border p-4 text-left transition',
                    activeDimension === dimension.id
                      ? 'border-[var(--platform-action)] bg-[var(--platform-group)] shadow-sm'
                      : 'border-[var(--platform-line)] bg-white hover:border-[var(--platform-action)]',
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold text-[var(--platform-ink)]">{dimension.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--platform-muted)]">{dimension.prompt}</span>
                      </span>
                    </span>
                    <span className={cn('mt-1 h-3 w-3 flex-none rounded-full', signalAccent(latestSignal))} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Registrar sinal
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">{selectedDimension.label}</h2>
            </div>
            {selectedDimension.latest && (
              <span className={cn('inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold', signalClass(selectedDimension.latest.signal))}>
                {selectedDimension.latest.signalLabel}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {signalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSignal(option.value)}
                className={cn(
                  'min-h-32 rounded-[var(--platform-radius-control)] border p-4 text-left transition',
                  signalClass(option.value),
                  signal === option.value ? 'ring-2 ring-[var(--platform-action)]' : 'opacity-80 hover:opacity-100',
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {option.value === 'red' ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
                  {option.short}
                </div>
                <p className="mt-2 text-sm leading-6">{option.body}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_1fr]">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--platform-ink)]">Energia percebida</span>
              <select
                value={energy}
                onChange={(event) => setEnergy(event.target.value as Energy)}
                className="mt-2 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-white px-3 py-2 text-sm text-[var(--platform-ink)]"
              >
                {energyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--platform-ink)]">Nota privada opcional</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 500))}
                rows={3}
                className="mt-2 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-white px-3 py-2 text-sm text-[var(--platform-ink)]"
                placeholder="Escreva só se quiser. Não use para urgências médicas."
              />
            </label>
          </div>

          <div className="mt-4 rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] p-4">
            <label className="flex items-start gap-3 text-sm leading-6 text-[var(--platform-muted)]">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Entendo que este é um auto-relato privado e não diagnóstico. Aceito guardar este registro por {data.consent.retentionDays} dias e posso apagar quando quiser.
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !accepted}
              className="rounded-[var(--platform-radius-control)] bg-[var(--platform-action)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvando...' : `Salvar ${selectedDimension.label}`}
            </button>
            <button
              type="button"
              onClick={erase}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-critical)] px-5 py-3 text-sm font-semibold text-[var(--platform-critical)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} aria-hidden="true" />
              Apagar meus registros
            </button>
            {message && <p className="text-sm font-medium text-[var(--platform-muted)]">{message}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Histórico privado</h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Últimos sinais visíveis somente para você.
          </p>
        </div>
        <div className="divide-y divide-[var(--platform-line)]">
          {(history?.entries ?? []).length === 0 ? (
            <p className="p-5 text-sm text-[var(--platform-muted)]">Nenhum registro no histórico.</p>
          ) : (
            history!.entries.map((entry) => (
              <article key={entry.id} className="grid gap-2 p-5 sm:grid-cols-[14rem_1fr]">
                <div>
                  <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', signalClass(entry.signal))}>
                    {entry.dimensionLabel}: {entry.signalLabel}
                  </span>
                  <p className="mt-2 text-xs text-[var(--platform-muted)]">{formatDate(entry.createdAt)}</p>
                </div>
                <div className="text-sm leading-6 text-[var(--platform-muted)]">
                  <p>{entry.guide}</p>
                  <p className="text-xs">Energia: {entry.energyLabel}</p>
                  {entry.note && <p className="mt-1">{entry.note}</p>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
