'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import DailyLesson from '@/components/gamification/DailyLesson';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Button } from '@/components/ui/Button';
import PageHeader from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';
import { getNr1PreviewState, isNr1RuntimeEntitled, type Nr1PreviewState } from '@/lib/nr1/preview-state';
import type { CompanyModuleNavigationRecord } from '@/types/modules';

const fetcher = (url: string) => fetch(url).then((response) => response.json());

interface SafeMission {
  id: string;
  title: string;
  description: string;
  action: 'read_content';
  completed: boolean;
}

interface CollaboratorHomeData {
  greeting?: string;
  userName?: string;
  date?: string;
  examsPercent?: number;
  examsTotal?: number;
  contentViewed?: number;
}

interface CompanyModulesResponse {
  modules?: CompanyModuleNavigationRecord[];
}

const actionLinkClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-action)] px-4 py-2 text-sm font-semibold text-[var(--platform-action-strong)] transition-colors duration-[var(--platform-duration-fast)] hover:bg-[var(--platform-group)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] focus-visible:ring-offset-2';

const disabledActionClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] px-4 py-2 text-sm font-semibold text-[var(--platform-muted)]';

function JourneyRow({
  step,
  icon,
  title,
  description,
  children,
  action,
}: {
  step: number;
  icon: ReactNode;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className="grid gap-4 px-4 py-5 sm:grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--platform-positive)] text-sm font-semibold text-[var(--platform-shell-text)]">
        {step}
      </span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--platform-group)] text-[var(--platform-positive)]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-[var(--platform-ink)]">{title}</h3>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-[var(--platform-muted)]">{description}</p>
        {children}
      </div>
      {action && <div className="hidden sm:block sm:justify-self-end">{action}</div>}
    </li>
  );
}

function Nr1JourneyRow({ state }: { state: Nr1PreviewState }) {
  const available = state === 'preview_available';
  const stateLabel = state === 'contract_required' ? 'Acesso controlado' : 'Acesso controlado';
  const actionLabel = available ? 'Abrir prévia' : 'Prévia indisponível';

  return (
    <JourneyRow
      step={2}
      icon={<ClipboardCheck size={21} strokeWidth={1.7} />}
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>Avaliação NR-1</span>
          <LockKeyhole size={17} aria-label="Acesso controlado" />
          <span className="rounded-full border border-[var(--platform-positive)] px-2 py-0.5 text-xs font-medium text-[var(--platform-positive)]">
            {stateLabel}
          </span>
        </span>
      }
      description="Prévia da avaliação psicossocial."
    >
      <div className="mt-3 flex flex-col gap-3 border-l-2 border-[var(--platform-group)] pl-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="nr1-preview-note" className="flex min-w-0 items-start gap-2 text-xs text-[var(--platform-muted)]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--platform-positive)]" aria-hidden="true" />
          <span>Esta prévia não gera laudo ou comprovação de conformidade.</span>
        </p>
        {available ? (
          <Link href="/avaliacao-nr1" className={`${actionLinkClass} shrink-0`} aria-describedby="nr1-preview-note">
            {actionLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" className={`${disabledActionClass} shrink-0`} disabled aria-describedby="nr1-preview-note">
            <LockKeyhole size={16} aria-hidden="true" />
            {actionLabel}
          </button>
        )}
      </div>
    </JourneyRow>
  );
}

export default function CollaboratorHomePage() {
  const searchParams = useSearchParams();
  const { data, isLoading } = useSWR<CollaboratorHomeData>('/api/collaborator', fetcher);
  const { data: moduleData } = useSWR<CompanyModulesResponse>('/api/company/modules', fetcher);
  const { data: streak, mutate: refreshStreak } = useSWR<{ checkedInToday?: boolean }>('/api/gamification/streak-status', fetcher);
  const { data: missionData, mutate: refreshMissions } = useSWR<{ missions?: SafeMission[] }>('/api/gamification/daily-missions', fetcher);
  const [checkingIn, setCheckingIn] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('focus') !== 'journey' || isLoading) return;

    const frame = window.requestAnimationFrame(() => {
      const journeyTitle = document.getElementById('journey-title');
      if (!journeyTitle) return;

      journeyTitle.scrollIntoView({ block: 'center', inline: 'nearest' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, searchParams]);

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

  const missions = missionData?.missions ?? [];
  const checkInLabel = streak?.checkedInToday ? 'Check-in registrado' : 'Fazer check-in';
  const nr1PreviewState = getNr1PreviewState({
    previewEnabled: process.env.NEXT_PUBLIC_UNIHER_NR1_PREVIEW === '1',
    entitled: isNr1RuntimeEntitled(moduleData?.modules),
    realIntegration: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        context="Jornada"
        title={`${data?.greeting ?? 'Olá'}, ${data?.userName ?? ''}`}
        description="Cada pequeno passo é cuidado que transforma."
        primaryAction={(
          <Button type="button" onClick={checkIn} disabled={checkingIn || streak?.checkedInToday} isLoading={checkingIn}>
            <Check size={17} aria-hidden="true" />
            {checkInLabel}
          </Button>
        )}
      />

      <SummaryBand
        label="Resumo da jornada"
        items={[
          { label: 'Conteúdos vistos', value: data?.contentViewed ?? 0 },
          { label: 'Exames em dia', value: data?.examsPercent ?? 0, detail: '%' },
        ]}
      />

      <section aria-labelledby="journey-title" className="overflow-hidden rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-4 py-5 sm:px-5">
          <h2
            id="journey-title"
            className="font-display text-2xl font-semibold text-[var(--platform-ink)]"
            style={{ scrollMarginTop: '80px' }}
          >
            Minha jornada
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">Siga os próximos passos para cuidar de você e da sua saúde.</p>
        </div>
        <ol className="divide-y divide-[var(--platform-line)]">
          <JourneyRow
            step={1}
            icon={<ClipboardCheck size={21} strokeWidth={1.7} />}
            title="Check-in de hoje"
            description={streak?.checkedInToday ? 'Seu registro de hoje está completo.' : 'Registre como você está se sentindo hoje.'}
            action={(
              <Button type="button" size="sm" onClick={checkIn} disabled={checkingIn || streak?.checkedInToday} isLoading={checkingIn}>
                {checkInLabel}
              </Button>
            )}
          >
            <div className="mt-3 sm:hidden">
              <Button type="button" size="sm" onClick={checkIn} disabled={checkingIn || streak?.checkedInToday} isLoading={checkingIn}>
                {checkInLabel}
              </Button>
            </div>
          </JourneyRow>
          <Nr1JourneyRow state={nr1PreviewState} />
          <JourneyRow
            step={3}
            icon={<BookOpen size={21} strokeWidth={1.7} />}
            title="Conteúdos recomendados"
            description="Acesse conteúdos selecionados para o seu bem-estar e desenvolvimento."
          />
        </ol>
      </section>

      <FeedbackState
        kind="denied"
        title="Pontuação e classificação em revisão"
        description={LEGACY_GAMIFICATION_STATE.message}
      />

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
                  className="min-h-24 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-3 text-sm text-[var(--platform-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)]"
                />
                <Button type="button" variant="outline" onClick={() => completeReading(mission)}>
                  Registrar leitura
                </Button>
              </>
            )}
          </div>
        ))}
      </section>

      {message && <p role="status" className="text-sm text-[var(--platform-muted)]">{message}</p>}
    </div>
  );
}
