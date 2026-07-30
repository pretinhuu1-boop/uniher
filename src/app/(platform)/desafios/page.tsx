'use client';

import { BookOpenCheck, Check, DoorOpen, Gauge, Plus, ShieldCheck, UsersRound } from 'lucide-react';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import PageHeader from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { useAuth } from '@/hooks/useAuth';
import type { CompanyChallengeCatalogItem, CompanyChallengeView } from '@/types/challenges';

type ChallengesPayload = {
  catalog: CompanyChallengeCatalogItem[];
  challenges: CompanyChallengeView[];
  error?: string;
};

const fetcher = async (url: string): Promise<ChallengesPayload> => {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Não foi possível carregar seus desafios');
  return payload;
};

function statusLabel(status: CompanyChallengeView['status']): string {
  if (status === 'completed') return 'Concluído';
  if (status === 'left') return 'Encerrado';
  return 'Em andamento';
}

function modeLabel(challenge: CompanyChallengeCatalogItem): string {
  if (challenge.mode === 'content_items') return `${challenge.target} conteúdos`;
  if (challenge.mode === 'sessions') return `${challenge.target} sessões`;
  return `${challenge.target} dias`;
}

function nextProgress(progress: number): number {
  if (progress < 25) return 25;
  if (progress < 50) return 50;
  if (progress < 75) return 75;
  return 100;
}

export default function DesafiosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canUseChallenges = user?.role === 'colaboradora' || user?.also_collaborator === 1;
  const { data, error, isLoading, mutate } = useSWR<ChallengesPayload>(
    canUseChallenges ? '/api/collaborator/challenges' : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const challenges = data?.challenges ?? [];
  const joined = challenges.filter((challenge) => challenge.status === 'joined');
  const completed = challenges.filter((challenge) => challenge.status === 'completed');
  const left = challenges.filter((challenge) => challenge.status === 'left');
  const participatedKeys = new Set(challenges.map((challenge) => challenge.catalog_key));
  const availableCatalog = (data?.catalog ?? []).filter((challenge) => !participatedKeys.has(challenge.key));

  const averageProgress = useMemo(() => {
    if (joined.length === 0) return 0;
    return Math.round(joined.reduce((sum, challenge) => sum + challenge.progress, 0) / joined.length);
  }, [joined]);

  async function runAction(key: string, action: () => Promise<Response>, successMessage: string) {
    setBusyKey(key);
    setMessage('');
    try {
      const response = await action();
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? 'Não foi possível atualizar o desafio.');
        return;
      }
      setMessage(successMessage);
      await mutate();
    } catch {
      setMessage('Não foi possível conectar agora.');
    } finally {
      setBusyKey(null);
    }
  }

  function joinChallenge(catalogKey: string) {
    return runAction(
      `join:${catalogKey}`,
      () => fetch('/api/collaborator/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogKey }),
      }),
      'Desafio iniciado.',
    );
  }

  function updateChallenge(challenge: CompanyChallengeView, body: Record<string, unknown>, successMessage: string) {
    return runAction(
      `${body.action}:${challenge.id}`,
      () => fetch(`/api/collaborator/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      successMessage,
    );
  }

  if (authLoading || isLoading) {
    return (
      <FeedbackState
        kind="loading"
        title="Carregando desafios"
        description="Estamos preparando apenas o catálogo seguro da sua empresa."
      />
    );
  }

  if (!canUseChallenges) {
    return (
      <FeedbackState
        kind="denied"
        title="Desafios indisponíveis"
        description="Este perfil não possui acesso persistido à experiência de colaboradora."
      />
    );
  }

  if (error) {
    return (
      <FeedbackState
        kind="error"
        title="Não foi possível abrir desafios"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Desafios"
        title="Desafios da empresa"
        description="Entre voluntariamente em ações educativas e gerais, registre progresso deliberado e saia quando quiser."
      />

      <SummaryBand
        label="Resumo privado"
        items={[
          { label: 'Em andamento', value: joined.length },
          { label: 'Concluídos', value: completed.length },
          { label: 'Progresso médio', value: averageProgress, detail: '%' },
        ]}
      />

      {message && (
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] px-4 py-3 text-sm text-[var(--platform-ink)]">
          {message}
        </div>
      )}

      <section aria-labelledby="challenge-privacy-title" className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <BookOpenCheck size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Participacao voluntaria
              </p>
              <h2 id="challenge-privacy-title" className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
                Convite educativo da empresa
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">
                Esta tela usa desafios aprovados da empresa. O progresso fica no fluxo da propria colaboradora e pode ser encerrado a qualquer momento.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-positive)_10%,var(--platform-surface))] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--platform-ink)]">
            <ShieldCheck size={19} aria-hidden="true" />
            Privacidade da participacao
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--platform-muted)]">
            <li className="flex gap-3"><DoorOpen size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Entrar e sair e sempre voluntario.</span></li>
            <li className="flex gap-3"><UsersRound size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Sua participacao fica no seu espaco privado.</span></li>
            <li className="flex gap-3"><ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Somente acoes educativas e gerais aprovadas entram neste fluxo.</span></li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="challenge-active-title" className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="challenge-active-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Meus desafios
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Atualize em passos claros. Concluir encerra o desafio; sair registra uma reversao explicita sem penalidade.
          </p>
        </div>

        {challenges.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FeedbackState
              kind="empty"
              title="Nenhum desafio iniciado"
              description="Escolha uma opcao do catalogo para participar."
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--platform-line)]">
            {challenges.map((challenge) => {
              const next = nextProgress(challenge.progress);
              const isJoined = challenge.status === 'joined';
              return (
                <article key={challenge.id} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--platform-ink)]">{challenge.challenge.title}</h3>
                      <span className="rounded-full border border-[var(--platform-line)] px-2 py-0.5 text-xs font-medium text-[var(--platform-muted)]">
                        {statusLabel(challenge.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{challenge.challenge.description}</p>
                    <p className="mt-3 text-xs font-semibold uppercase text-[var(--platform-action-strong)]">{modeLabel(challenge.challenge)}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--platform-group)]" aria-label={`Progresso ${challenge.progress}%`}>
                      <div className="h-full rounded-full bg-[var(--platform-action)]" style={{ width: `${challenge.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[var(--platform-muted)]">{challenge.progress}% registrado</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {isJoined && challenge.progress < 100 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={busyKey === `progress:${challenge.id}`}
                        onClick={() => updateChallenge(challenge, { action: 'progress', progress: next }, `Progresso atualizado para ${next}%.`)}
                      >
                        <Gauge size={16} aria-hidden="true" />
                        Avancar
                      </Button>
                    )}
                    {isJoined && (
                      <Button
                        type="button"
                        size="sm"
                        isLoading={busyKey === `complete:${challenge.id}`}
                        onClick={() => updateChallenge(challenge, { action: 'complete' }, 'Desafio concluido.')}
                      >
                        <Check size={16} aria-hidden="true" />
                        Concluir
                      </Button>
                    )}
                    {isJoined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isLoading={busyKey === `leave:${challenge.id}`}
                        onClick={() => updateChallenge(challenge, { action: 'leave' }, 'Participacao encerrada.')}
                      >
                        <DoorOpen size={16} aria-hidden="true" />
                        Sair
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="challenge-catalog-title" className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="challenge-catalog-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Catalogo aprovado
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Opcoes neutras e aprovadas para a rotina da empresa.
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
          {availableCatalog.map((challenge) => (
            <article key={challenge.key} className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
                <Plus size={19} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-[var(--platform-ink)]">{challenge.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{challenge.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-[var(--platform-action-strong)]">{modeLabel(challenge)}</p>
              <Button
                type="button"
                className="mt-4 w-full"
                variant="secondary"
                size="sm"
                isLoading={busyKey === `join:${challenge.key}`}
                onClick={() => joinChallenge(challenge.key)}
              >
                <DoorOpen size={16} aria-hidden="true" />
                Entrar
              </Button>
            </article>
          ))}
          {availableCatalog.length === 0 && (
            <div className="lg:col-span-3">
              <FeedbackState
                kind="empty"
                title="Catalogo ja foi escolhido"
                description="Voce ja entrou em todas as opcoes disponiveis nesta primeira versao."
              />
            </div>
          )}
        </div>
      </section>

      {left.length > 0 && (
        <p className="text-xs text-[var(--platform-muted)]">
          {left.length} participacao encerrada permanece disponivel apenas no seu historico privado.
        </p>
      )}
    </div>
  );
}
