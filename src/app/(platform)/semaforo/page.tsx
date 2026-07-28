'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';
import PageHeader from '@/components/platform/PageHeader';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { cn } from '@/lib/utils';

type Signal = 'green' | 'yellow' | 'red';
type Energy = 'low' | 'steady' | 'high';

interface SemaforoEntry {
  id: string;
  signal: Signal;
  signalLabel: string;
  tone: Signal;
  energy: Energy;
  energyLabel: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
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
  latest: SemaforoEntry | null;
}

interface SemaforoHistory {
  entries: SemaforoEntry[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Falha ao carregar o semáforo privado.');
  return response.json();
};

const signalOptions: Array<{ value: Signal; title: string; body: string; className: string }> = [
  {
    value: 'green',
    title: 'Estou bem',
    body: 'Momento estável. Quero apenas registrar como estou hoje.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    value: 'yellow',
    title: 'Preciso observar',
    body: 'Percebi sinais de atenção e quero acompanhar sem gerar alerta automático.',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    value: 'red',
    title: 'Preciso de apoio',
    body: 'Quero registrar que preciso cuidar de mim. Isso não vira laudo ou decisão ocupacional.',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
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

export default function SemaforoPage() {
  const { data, error, isLoading, mutate } = useSWR<SemaforoState>('/api/collaborator/semaforo', fetcher);
  const { data: history, mutate: mutateHistory } = useSWR<SemaforoHistory>('/api/collaborator/semaforo/history', fetcher);
  const [signal, setSignal] = useState<Signal>('green');
  const [energy, setEnergy] = useState<Energy>('steady');
  const [note, setNote] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const activeSignal = useMemo(
    () => signalOptions.find((option) => option.value === signal) ?? signalOptions[0],
    [signal],
  );

  async function submit() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/collaborator/semaforo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          consentAccepted: accepted,
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
      setMessage('Registro privado salvo.');
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

  if (error || !data) {
    return <FeedbackState kind="error" title="Semáforo indisponível" description="Tente novamente em instantes." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Saúde primária"
        title="Semáforo da Saúde"
        description="Auto-relato privado, não diagnóstico e sem acesso individual por empresa."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <ShieldCheck size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Contrato de privacidade
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
                Só você vê estes registros
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">
                Este espaço guarda seu auto-relato por {data.consent.retentionDays} dias. Não calcula risco, não envia alerta clínico e não aparece para RH, liderança, Admin Empresa ou Master.
              </p>
            </div>
          </div>
        </div>

        <div className={cn('rounded-[var(--platform-radius-surface)] border p-5 sm:p-6', data.latest ? signalClass(data.latest.signal) : 'border-[var(--platform-line)] bg-[var(--platform-surface)]')}>
          <p className="text-xs font-semibold uppercase">Último registro</p>
          {data.latest ? (
            <div className="mt-3 space-y-2">
              <h2 className="text-2xl font-semibold">{data.latest.signalLabel}</h2>
              <p className="text-sm">Energia: {data.latest.energyLabel}</p>
              <p className="text-xs">Registrado em {formatDate(data.latest.createdAt)}</p>
              {data.latest.note && <p className="text-sm leading-6">{data.latest.note}</p>}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--platform-muted)]">
              Nenhum auto-relato salvo ainda.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Registrar como estou agora</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {signalOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSignal(option.value)}
              className={cn(
                'min-h-36 rounded-[var(--platform-radius-control)] border p-4 text-left transition',
                option.className,
                signal === option.value ? 'ring-2 ring-[var(--platform-action)]' : 'opacity-80 hover:opacity-100',
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                {option.value === 'red' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                {option.title}
              </div>
              <p className="mt-2 text-sm leading-6">{option.body}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[16rem_1fr]">
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

        <label className="mt-4 flex items-start gap-3 rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] p-4 text-sm leading-6 text-[var(--platform-muted)]">
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

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={submit}
            disabled={saving || !accepted}
            className="rounded-[var(--platform-radius-control)] bg-[var(--platform-action)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Salvando...' : `Salvar: ${activeSignal.title}`}
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
      </section>

      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Histórico privado</h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Últimos registros visíveis somente para você.
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
                    {entry.signalLabel}
                  </span>
                  <p className="mt-2 text-xs text-[var(--platform-muted)]">{formatDate(entry.createdAt)}</p>
                </div>
                <div className="text-sm leading-6 text-[var(--platform-muted)]">
                  <p>Energia: {entry.energyLabel}</p>
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
