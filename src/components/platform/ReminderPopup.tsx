'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ReminderNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

interface SemaforoItem {
  dimension: string;
  status: 'green' | 'yellow' | 'red';
}

const POPUP_TYPES = new Set(['reminder', 'alert']);

function normalizeDimension(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getLocalDateValue(base = new Date()): string {
  const year = base.getFullYear();
  const month = `${base.getMonth() + 1}`.padStart(2, '0');
  const day = `${base.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseSchedule(message: string): { title: string; date: string | null; time: string | null } {
  const [titlePart, schedulePart = ''] = message.split(' - ');
  const dateMatch = schedulePart.match(/(\d{4}-\d{2}-\d{2})/);
  const timeMatch = schedulePart.match(/(\d{2}:\d{2})/);
  return {
    title: titlePart?.trim() || message.trim(),
    date: dateMatch?.[1] || null,
    time: timeMatch?.[1] || null,
  };
}

function formatSchedule(date: string | null, time: string | null): string {
  if (!date) return 'Horario ainda nao definido';
  const parsed = new Date(`${date}T${time || '09:00'}:00`);
  if (Number.isNaN(parsed.getTime())) return time ? `${date} as ${time}` : date;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status?: 'green' | 'yellow' | 'red') {
  if (status === 'red') return { label: 'Urgente', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (status === 'yellow') return { label: 'Atencao', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (status === 'green') return { label: 'Saudavel', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  return null;
}

export default function ReminderPopup() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'agenda' | 'snooze' | 'complete' | 'reschedule' | 'close' | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(getLocalDateValue());
  const [rescheduleTime, setRescheduleTime] = useState('08:00');
  const [rescheduleError, setRescheduleError] = useState('');

  const shouldLoad = !isLoading && !!user && pathname !== '/auth';
  const { data, mutate } = useSWR<ReminderNotification[]>(
    shouldLoad ? '/api/notifications' : null,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true, dedupingInterval: 10000 }
  );

  const activeReminder = useMemo(() => {
    if (!Array.isArray(data)) return null;
    return data.find((item) => !item.read && POPUP_TYPES.has(item.type) && item.id !== dismissedId) ?? null;
  }, [data, dismissedId]);

  const canControlReminder = activeReminder?.type === 'reminder';

  const semaforoDimension = useMemo(() => {
    if (!activeReminder) return null;
    const match = activeReminder.message.match(/^Lembrete de (.+?) - /i) || activeReminder.message.match(/^Lembrete de (.+)$/i);
    return match?.[1]?.trim() || null;
  }, [activeReminder]);

  const scheduleInfo = useMemo(() => {
    if (!activeReminder) return { title: '', date: null, time: null };
    return parseSchedule(activeReminder.message);
  }, [activeReminder]);

  const { data: semaforoData } = useSWR<SemaforoItem[]>(
    shouldLoad && semaforoDimension ? '/api/collaborator/semaforo' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15000 }
  );

  const focusedSemaforoItem = useMemo(() => {
    if (!semaforoDimension || !Array.isArray(semaforoData)) return null;
    return semaforoData.find((item) => normalizeDimension(item.dimension) === normalizeDimension(semaforoDimension)) || null;
  }, [semaforoData, semaforoDimension]);

  const semaforoBadge = getStatusBadge(focusedSemaforoItem?.status);

  useEffect(() => {
    if (!activeReminder || typeof window === 'undefined') return;
    const sessionKey = `uniher-reminder-popup:${activeReminder.id}`;
    if (sessionStorage.getItem(sessionKey) === '1') {
      setDismissedId(activeReminder.id);
    }
  }, [activeReminder]);

  useEffect(() => {
    if (!activeReminder) return;
    setShowReschedule(false);
    setRescheduleError('');
    setRescheduleDate(scheduleInfo.date || getLocalDateValue());
    setRescheduleTime(scheduleInfo.time || '08:00');
  }, [activeReminder, scheduleInfo.date, scheduleInfo.time]);

  const markAsRead = useCallback(async (id: string) => {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });
    if (!response.ok) {
      throw new Error('Falha ao marcar lembrete como lido');
    }
    await mutate();
  }, [mutate]);

  const persistDismissal = useCallback((id: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`uniher-reminder-popup:${id}`, '1');
    }
    setDismissedId(id);
  }, []);

  const handleClose = useCallback(async () => {
    if (!activeReminder) return;
    setActionLoading('close');
    try {
      persistDismissal(activeReminder.id);
      await markAsRead(activeReminder.id);
    } finally {
      setActionLoading(null);
    }
  }, [activeReminder, markAsRead, persistDismissal]);

  const handleOpenContext = useCallback(async () => {
    if (!activeReminder) return;
    setActionLoading('agenda');
    try {
      await markAsRead(activeReminder.id);
      persistDismissal(activeReminder.id);
      if (semaforoDimension) {
        router.push(`/semaforo?focus=${encodeURIComponent(semaforoDimension)}`);
      } else {
        router.push('/agenda');
      }
    } finally {
      setActionLoading(null);
    }
  }, [activeReminder, markAsRead, persistDismissal, router, semaforoDimension]);

  const handleReminderAction = useCallback(async (action: 'snooze_15m' | 'complete' | 'reschedule', date?: string, time?: string) => {
    if (!activeReminder) return;
    setActionLoading(action === 'snooze_15m' ? 'snooze' : action === 'complete' ? 'complete' : 'reschedule');
    try {
      const response = await fetch('/api/notifications/reminder-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: activeReminder.id, action, date, time }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Falha ao atualizar lembrete');
      }
      persistDismissal(activeReminder.id);
      await mutate();
    } finally {
      setActionLoading(null);
    }
  }, [activeReminder, mutate, persistDismissal]);

  const submitReschedule = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rescheduleDate)) {
      setRescheduleError('Escolha uma data valida.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(rescheduleTime)) {
      setRescheduleError('Escolha um horario valido.');
      return;
    }
    setRescheduleError('');
    await handleReminderAction('reschedule', rescheduleDate, rescheduleTime);
  }, [handleReminderAction, rescheduleDate, rescheduleTime]);

  if (!activeReminder) return null;

  return (
    <Modal
      isOpen={!!activeReminder}
      onClose={handleClose}
      title="Lembrete importante"
      className="max-w-md rounded-[28px]"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-100 text-2xl">
            🔔
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-uni-text-900">{activeReminder.title}</p>
            <p className="mt-1 text-sm leading-6 text-uni-text-500">{scheduleInfo.title}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">Horario marcado</p>
          <p className="mt-2 text-base font-semibold text-uni-text-900">{formatSchedule(scheduleInfo.date, scheduleInfo.time)}</p>
        </div>

        {semaforoDimension && (
          <div className="rounded-2xl border border-border-1 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-uni-text-400">Dimensao relacionada</p>
                <p className="mt-1 text-sm font-semibold text-uni-text-900">{semaforoDimension}</p>
              </div>
              {semaforoBadge && (
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${semaforoBadge.className}`}>
                  {semaforoBadge.label}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border-1 bg-cream-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">O que fazer agora</p>
          <p className="mt-2 text-sm leading-6 text-uni-text-600">
            {semaforoDimension
              ? `Abra o semaforo para revisar ${semaforoDimension.toLowerCase()}, reagende se precisar ou marque como feito.`
              : 'Abra sua agenda para confirmar o horario, reagendar ou marcar como realizado.'}
          </p>
        </div>

        {canControlReminder && showReschedule && (
          <div className="rounded-2xl border border-border-1 bg-white px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-uni-text-900">Reagendar lembrete</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Data"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                aria-label="Nova data do lembrete"
              />
              <Input
                label="Horario"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                aria-label="Novo horario do lembrete"
              />
            </div>
            {rescheduleError && <p className="text-xs font-medium text-rose-600">{rescheduleError}</p>}
            <div className="flex gap-3">
              <button
                onClick={submitReschedule}
                disabled={actionLoading !== null}
                className="min-h-11 flex-1 rounded-2xl bg-gold-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gold-600 disabled:opacity-60"
              >
                {actionLoading === 'reschedule' ? 'Salvando...' : 'Confirmar reagendamento'}
              </button>
              <button
                onClick={() => {
                  setShowReschedule(false);
                  setRescheduleError('');
                }}
                disabled={actionLoading !== null}
                className="min-h-11 rounded-2xl border border-border-2 bg-white px-4 py-3 text-sm font-semibold text-uni-text-600 transition hover:bg-cream-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={handleOpenContext}
            disabled={actionLoading !== null}
            className="min-h-12 rounded-2xl bg-gold-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gold-600 disabled:opacity-60"
          >
            {actionLoading === 'agenda'
              ? 'Abrindo...'
              : semaforoDimension
              ? 'Abrir no semaforo'
              : 'Abrir minha agenda'}
          </button>

          {canControlReminder ? (
            <button
              onClick={() => handleReminderAction('snooze_15m')}
              disabled={actionLoading !== null}
              className="min-h-12 rounded-2xl border border-border-2 bg-white px-4 py-3 text-sm font-semibold text-uni-text-600 transition hover:bg-cream-50 disabled:opacity-60"
            >
              {actionLoading === 'snooze' ? 'Adiando...' : 'Adiar 15 min'}
            </button>
          ) : (
            <button
              onClick={handleClose}
              disabled={actionLoading !== null}
              className="min-h-12 rounded-2xl border border-border-2 bg-white px-4 py-3 text-sm font-semibold text-uni-text-600 transition hover:bg-cream-50 disabled:opacity-60"
            >
              {actionLoading === 'close' ? 'Fechando...' : 'Depois eu vejo'}
            </button>
          )}

          {canControlReminder && (
            <button
              onClick={() => {
                setShowReschedule((prev) => !prev);
                setRescheduleError('');
              }}
              disabled={actionLoading !== null}
              className="min-h-12 rounded-2xl border border-border-2 bg-white px-4 py-3 text-sm font-semibold text-uni-text-600 transition hover:bg-cream-50 disabled:opacity-60"
            >
              {showReschedule ? 'Fechar reagendamento' : 'Reagendar'}
            </button>
          )}

          {canControlReminder && (
            <button
              onClick={() => handleReminderAction('complete')}
              disabled={actionLoading !== null}
              className="min-h-12 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {actionLoading === 'complete' ? 'Salvando...' : 'Marcar como feito'}
            </button>
          )}

          {canControlReminder && (
            <button
              onClick={handleClose}
              disabled={actionLoading !== null}
              className="min-h-12 rounded-2xl border border-border-2 bg-white px-4 py-3 text-sm font-semibold text-uni-text-600 transition hover:bg-cream-50 disabled:opacity-60 sm:col-span-2"
            >
              {actionLoading === 'close' ? 'Fechando...' : 'Depois eu vejo'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
