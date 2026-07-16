'use client';

import { useState } from 'react';
import useSWR from 'swr';
import DailyLesson from '@/components/gamification/DailyLesson';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

const fetcher = (url: string) => fetch(url).then((response) => response.json());

interface SafeMission {
  id: string;
  title: string;
  description: string;
  action: 'read_content';
  completed: boolean;
}

export default function CollaboratorHomePage() {
  const { data, isLoading } = useSWR('/api/collaborator', fetcher);
  const { data: streak, mutate: refreshStreak } = useSWR('/api/gamification/streak-status', fetcher);
  const { data: missionData, mutate: refreshMissions } = useSWR('/api/gamification/daily-missions', fetcher);
  const [checkingIn, setCheckingIn] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  if (isLoading) {
    return (
      <FeedbackState
        kind="loading"
        title="Carregando sua jornada"
        description="Estamos preparando seu conteúdo e seus registros pessoais."
      />
    );
  }

  const checkIn = async () => {
    setCheckingIn(true);
    setMessage('');
    const response = await fetch('/api/gamification/check-in', { method: 'POST' });
    setMessage(response.ok ? 'Presença registrada.' : 'Seu check-in já foi registrado hoje.');
    await refreshStreak();
    setCheckingIn(false);
  };

  const completeReading = async (mission: SafeMission) => {
    const response = await fetch(`/api/gamification/daily-missions/${mission.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setMessage(response.ok ? 'Progresso educativo registrado.' : 'Descreva o conteúdo lido com pelo menos 20 caracteres.');
    if (response.ok) {
      setNote('');
      await refreshMissions();
    }
  };

  const missions = (missionData?.missions ?? []) as SafeMission[];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-[var(--platform-muted)]">{data?.date}</p>
        <h1 className="text-2xl font-semibold text-[var(--platform-ink)]">
          {data?.greeting ?? 'Olá'}, {data?.userName ?? ''}
        </h1>
      </header>

      <FeedbackState
        kind="denied"
        title="Pontuação e classificação em revisão"
        description={LEGACY_GAMIFICATION_STATE.message}
      />

      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Presença pessoal</h2>
        <p className="mt-1 text-sm text-[var(--platform-muted)]">
          {streak?.checkedInToday ? 'Check-in registrado hoje.' : 'Registre sua presença de hoje.'}
        </p>
        <button
          type="button"
          onClick={checkIn}
          disabled={checkingIn || streak?.checkedInToday}
          className="mt-4 rounded-lg bg-[var(--platform-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {checkingIn ? 'Registrando...' : 'Fazer check-in'}
        </button>
      </section>

      <DailyLesson />

      <section className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Leitura educativa</h2>
        {missions.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--platform-muted)]">Nenhuma leitura pendente hoje.</p>
        ) : missions.map((mission) => (
          <div key={mission.id} className="mt-3 space-y-3">
            <div>
              <h3 className="font-medium text-[var(--platform-ink)]">{mission.title}</h3>
              <p className="text-sm text-[var(--platform-muted)]">{mission.description}</p>
            </div>
            {!mission.completed && (
              <>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Conte brevemente o que você leu"
                  className="min-h-24 w-full rounded-lg border border-[var(--platform-line)] p-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => completeReading(mission)}
                  className="rounded-lg border border-[var(--platform-line)] px-4 py-2 text-sm font-semibold"
                >
                  Registrar leitura
                </button>
              </>
            )}
          </div>
        ))}
      </section>

      {message && <p role="status" className="text-sm text-[var(--platform-muted)]">{message}</p>}
    </div>
  );
}
