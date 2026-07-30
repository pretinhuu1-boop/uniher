'use client';

import { Archive, Check, CircleGauge, ListChecks, PenLine, Plus, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import PageHeader from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { useAuth } from '@/hooks/useAuth';
import type { PersonalObjectiveTemplate, PersonalObjectiveView } from '@/types/objectives';

type ObjectivesPayload = {
  templates: PersonalObjectiveTemplate[];
  objectives: PersonalObjectiveView[];
  error?: string;
};

const fetcher = async (url: string): Promise<ObjectivesPayload> => {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Nao foi possivel carregar seus objetivos');
  return payload;
};

function statusLabel(status: PersonalObjectiveView['status']): string {
  if (status === 'completed') return 'Concluido';
  if (status === 'archived') return 'Arquivado';
  return 'Em andamento';
}

function nextProgress(progress: number): number {
  if (progress < 25) return 25;
  if (progress < 50) return 50;
  if (progress < 75) return 75;
  return 100;
}

export default function ObjetivosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canUseObjectives = user?.role === 'colaboradora' || user?.also_collaborator === 1;
  const { data, error, isLoading, mutate } = useSWR<ObjectivesPayload>(
    canUseObjectives ? '/api/collaborator/objectives' : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const objectives = data?.objectives ?? [];
  const activeObjectives = objectives.filter((objective) => objective.status === 'active');
  const completedObjectives = objectives.filter((objective) => objective.status === 'completed');
  const activeTemplateKeys = new Set(activeObjectives.map((objective) => objective.template_key));
  const availableTemplates = (data?.templates ?? []).filter((template) => !activeTemplateKeys.has(template.key));

  const averageProgress = useMemo(() => {
    if (activeObjectives.length === 0) return 0;
    return Math.round(activeObjectives.reduce((sum, objective) => sum + objective.progress, 0) / activeObjectives.length);
  }, [activeObjectives]);

  async function runAction(key: string, action: () => Promise<Response>, successMessage: string) {
    setBusyKey(key);
    setMessage('');
    try {
      const response = await action();
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? 'Nao foi possivel atualizar o objetivo.');
        return;
      }
      setMessage(successMessage);
      await mutate();
    } catch {
      setMessage('Nao foi possivel conectar agora.');
    } finally {
      setBusyKey(null);
    }
  }

  function startObjective(templateKey: string) {
    return runAction(
      `start:${templateKey}`,
      () => fetch('/api/collaborator/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey }),
      }),
      'Objetivo iniciado.',
    );
  }

  function updateObjective(objective: PersonalObjectiveView, body: Record<string, unknown>, successMessage: string) {
    return runAction(
      `${body.action}:${objective.id}`,
      () => fetch(`/api/collaborator/objectives/${objective.id}`, {
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
        title="Carregando seus objetivos"
        description="Estamos preparando apenas os registros visiveis para voce."
      />
    );
  }

  if (!canUseObjectives) {
    return (
      <FeedbackState
        kind="denied"
        title="Objetivos pessoais indisponiveis"
        description="Este perfil nao possui acesso persistido a experiencia de colaboradora."
      />
    );
  }

  if (error) {
    return (
      <FeedbackState
        kind="error"
        title="Nao foi possivel abrir objetivos"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Minha jornada"
        title="Objetivos pessoais"
        description="Escolha compromissos simples, registre progresso de forma deliberada e mantenha tudo privado."
      />

      <SummaryBand
        label="Resumo privado"
        items={[
          { label: 'Em andamento', value: activeObjectives.length },
          { label: 'Concluidos', value: completedObjectives.length },
          { label: 'Progresso medio', value: averageProgress, detail: '%' },
        ]}
      />

      {message && (
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] px-4 py-3 text-sm text-[var(--platform-ink)]">
          {message}
        </div>
      )}

      <section
        aria-labelledby="objective-privacy-title"
        className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <ShieldCheck size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Jornada privada
              </p>
              <h2 id="objective-privacy-title" className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
                Privado e voluntario
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">
                A pagina usa somente objetivos iniciados pela propria colaboradora. O progresso fica no seu espaco pessoal e avanca apenas quando voce confirma uma acao.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-positive)_10%,var(--platform-surface))] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--platform-ink)]">
            <ListChecks size={19} aria-hidden="true" />
            Privacidade da jornada
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--platform-muted)]">
            <li className="flex gap-3"><ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Catalogo aprovado, sem texto livre sensivel.</span></li>
            <li className="flex gap-3"><ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Seu progresso e salvo com seguranca quando voce atualiza a jornada.</span></li>
            <li className="flex gap-3"><ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Sem exposicao publica de progresso individual.</span></li>
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="objective-active-title"
        className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]"
      >
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="objective-active-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Meus objetivos
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Atualize em passos claros. Concluir encerra o objetivo; arquivar remove da rotina mantendo sua jornada privada.
          </p>
        </div>

        {objectives.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FeedbackState
              kind="empty"
              title="Nenhum objetivo iniciado"
              description="Escolha uma opcao do catalogo para comecar."
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--platform-line)]">
            {objectives.map((objective) => {
              const next = nextProgress(objective.progress);
              const isActive = objective.status === 'active';
              return (
                <article key={objective.id} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--platform-ink)]">{objective.template.title}</h3>
                      <span className="rounded-full border border-[var(--platform-line)] px-2 py-0.5 text-xs font-medium text-[var(--platform-muted)]">
                        {statusLabel(objective.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{objective.template.description}</p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--platform-group)]" aria-label={`Progresso ${objective.progress}%`}>
                      <div className="h-full rounded-full bg-[var(--platform-action)]" style={{ width: `${objective.progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[var(--platform-muted)]">{objective.progress}% registrado</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {isActive && objective.progress < 100 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={busyKey === `progress:${objective.id}`}
                        onClick={() => updateObjective(objective, { action: 'progress', progress: next }, `Progresso atualizado para ${next}%.`)}
                      >
                        <CircleGauge size={16} aria-hidden="true" />
                        Avancar
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        type="button"
                        size="sm"
                        isLoading={busyKey === `complete:${objective.id}`}
                        onClick={() => updateObjective(objective, { action: 'complete' }, 'Objetivo concluido.')}
                      >
                        <Check size={16} aria-hidden="true" />
                        Concluir
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isLoading={busyKey === `archive:${objective.id}`}
                        onClick={() => updateObjective(objective, { action: 'archive' }, 'Objetivo arquivado.')}
                      >
                        <Archive size={16} aria-hidden="true" />
                        Arquivar
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="objective-catalog-title" className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="objective-catalog-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Catalogo aprovado
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Opcoes neutras para iniciar sem escrever informacoes sensiveis.
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
          {availableTemplates.map((template) => (
            <article key={template.key} className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
                <PenLine size={19} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-[var(--platform-ink)]">{template.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{template.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-[var(--platform-action-strong)]">{template.cadence}</p>
              <Button
                type="button"
                className="mt-4 w-full"
                variant="secondary"
                size="sm"
                isLoading={busyKey === `start:${template.key}`}
                onClick={() => startObjective(template.key)}
              >
                <Plus size={16} aria-hidden="true" />
                Iniciar
              </Button>
            </article>
          ))}
          {availableTemplates.length === 0 && (
            <div className="lg:col-span-3">
              <FeedbackState
                kind="empty"
                title="Catalogo ja esta em uso"
                description="Arquive ou conclua um objetivo antes de iniciar outra opcao igual."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
