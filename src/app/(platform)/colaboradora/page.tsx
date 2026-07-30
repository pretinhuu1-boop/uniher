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
  campaignsActive?: number;
  campaignsTotal?: number;
}

interface CompanyModulesResponse {
  modules?: CompanyModuleNavigationRecord[];
}

const actionLinkClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-action)] px-4 py-2 text-sm font-semibold text-[var(--platform-action-strong)] transition-colors duration-[var(--platform-duration-fast)] hover:bg-[var(--platform-group)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] focus-visible:ring-offset-2';

const disabledActionClass =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] px-4 py-2 text-sm font-semibold text-[var(--platform-muted)]';

const WELLBEING_MOOD_OPTIONS = [
  { value: 'muito_bem', label: 'Muito bem' },
  { value: 'bem', label: 'Bem' },
  { value: 'neutra', label: 'Neutra' },
  { value: 'cansada', label: 'Cansada' },
  { value: 'sobrecarregada', label: 'Sobrecarregada' },
] as const;

type WellbeingMood = (typeof WELLBEING_MOOD_OPTIONS)[number]['value'];
type WellbeingStatusMood = WellbeingMood | 'nao_informado';

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

function WellbeingMoodPicker({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: WellbeingMood;
  disabled?: boolean;
  onChange: (value: WellbeingMood) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-[var(--platform-muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {WELLBEING_MOOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-[var(--platform-radius-control)] border px-3 text-sm font-medium transition-colors ${
              value === option.value
                ? 'border-[var(--platform-action)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]'
                : 'border-[var(--platform-line)] bg-[var(--platform-surface)] text-[var(--platform-muted)]'
            }`}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Nr1JourneyRow({ state, step }: { state: Nr1PreviewState; step: number }) {
  const available = state === 'preview_available';
  const stateLabel = state === 'contract_required' ? 'Acesso controlado' : 'Acesso controlado';
  const actionLabel = available ? 'Abrir prévia' : 'Prévia indisponível';

  return (
    <JourneyRow
      step={step}
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
  const { data: streak, mutate: refreshStreak } = useSWR<{
    checkedInToday?: boolean;
    checkedOutToday?: boolean;
    checkInMood?: WellbeingStatusMood | null;
    checkOutMood?: WellbeingStatusMood | null;
  }>('/api/gamification/streak-status', fetcher);
  const { data: missionData, mutate: refreshMissions } = useSWR<{ missions?: SafeMission[] }>('/api/gamification/daily-missions', fetcher);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkInMood, setCheckInMood] = useState<WellbeingMood>('neutra');
  const [checkOutMood, setCheckOutMood] = useState<WellbeingMood>('neutra');
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

    try {
      const response = await fetch('/api/gamification/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: checkInMood }),
      });
      setMessage(response.ok ? 'Check-in registrado.' : 'Seu check-in já foi registrado hoje.');
      await refreshStreak();
    } catch {
      setMessage('Não foi possível registrar o check-in. Tente novamente.');
    } finally {
      setCheckingIn(false);
    }
  };

  const checkOut = async () => {
    setCheckingOut(true);
    setMessage('');

    try {
      const response = await fetch('/api/wellbeing/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: checkOutMood }),
      });
      setMessage(response.ok ? 'Check-out registrado.' : 'Seu check-out já foi registrado hoje.');
      await refreshStreak();
    } catch {
      setMessage('Não foi possível registrar o check-out. Tente novamente.');
    } finally {
      setCheckingOut(false);
    }
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
          { label: 'Campanhas', value: data?.campaignsActive ?? 0, detail: `de ${data?.campaignsTotal ?? 0}` },
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
            description={streak?.checkedInToday ? 'Como você chega hoje já foi registrado.' : 'Como você chega hoje?'}
            action={(
              <Button type="button" size="sm" onClick={checkIn} disabled={checkingIn || streak?.checkedInToday} isLoading={checkingIn}>
                {checkInLabel}
              </Button>
            )}
          >
            <WellbeingMoodPicker
              label="Como você chega hoje?"
              value={(streak?.checkInMood && streak.checkInMood !== 'nao_informado' ? streak.checkInMood : checkInMood) as WellbeingMood}
              disabled={Boolean(streak?.checkedInToday)}
              onChange={setCheckInMood}
            />
            <div className="mt-3 sm:hidden">
              <Button type="button" size="sm" onClick={checkIn} disabled={checkingIn || streak?.checkedInToday} isLoading={checkingIn}>
                {checkInLabel}
              </Button>
            </div>
          </JourneyRow>
          <JourneyRow
            step={2}
            icon={<Check size={21} strokeWidth={1.7} />}
            title="Check-out do dia"
            description={streak?.checkedOutToday ? 'Como você encerra o seu dia já foi registrado.' : 'Como você encerra o seu dia?'}
            action={(
              <Button type="button" size="sm" onClick={checkOut} disabled={checkingOut || streak?.checkedOutToday} isLoading={checkingOut}>
                {streak?.checkedOutToday ? 'Check-out registrado' : 'Fazer check-out'}
              </Button>
            )}
          >
            <WellbeingMoodPicker
              label="Como você encerra o seu dia?"
              value={(streak?.checkOutMood && streak.checkOutMood !== 'nao_informado' ? streak.checkOutMood : checkOutMood) as WellbeingMood}
              disabled={Boolean(streak?.checkedOutToday)}
              onChange={setCheckOutMood}
            />
            <div className="mt-3 sm:hidden">
              <Button type="button" size="sm" onClick={checkOut} disabled={checkingOut || streak?.checkedOutToday} isLoading={checkingOut}>
                {streak?.checkedOutToday ? 'Check-out registrado' : 'Fazer check-out'}
              </Button>
            </div>
          </JourneyRow>
          <Nr1JourneyRow state={nr1PreviewState} step={3} />
          <JourneyRow
            step={4}
            icon={<BookOpen size={21} strokeWidth={1.7} />}
            title="Conteúdos recomendados"
            description="Acesse conteúdos selecionados para o seu bem-estar e desenvolvimento."
          />
        </ol>
      </section>

      <section
        aria-labelledby="private-journey-title"
        className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--platform-action-strong)]">Sem competição</p>
              <h2 id="private-journey-title" className="mt-1 text-lg font-semibold text-[var(--platform-ink)]">Jornada privada</h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--platform-muted)]">
                Continue pelos objetivos, desafios voluntários e marcos privados derivados somente de eventos elegíveis.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Link href="/objetivos" aria-label="Abrir objetivos" className={actionLinkClass}>
            <ClipboardCheck size={17} strokeWidth={1.8} aria-hidden="true" />
            Objetivos
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link href="/desafios" aria-label="Abrir desafios" className={actionLinkClass}>
            <Check size={17} strokeWidth={1.8} aria-hidden="true" />
            Desafios
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
          <Link href="/conquistas" aria-label="Abrir conquistas" className={actionLinkClass}>
            <LockKeyhole size={17} strokeWidth={1.8} aria-hidden="true" />
            Marcos privados
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
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
