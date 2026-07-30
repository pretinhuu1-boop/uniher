'use client';

import { Award, CheckCircle2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import useSWR from 'swr';
import { FeedbackState } from '@/components/ui/FeedbackState';
import PageHeader from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { useAuth } from '@/hooks/useAuth';
import type { PrivateAchievementView } from '@/types/achievements';

type AchievementsPayload = {
  achievements: PrivateAchievementView[];
  error?: string;
};

const fetcher = async (url: string): Promise<AchievementsPayload> => {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Nao foi possivel carregar suas conquistas');
  return payload;
};

function statusLabel(status: PrivateAchievementView['status']): string {
  if (status === 'earned') return 'Conquistada';
  if (status === 'revoked') return 'Revogada';
  return 'Bloqueada';
}

export default function ConquistasPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canUseAchievements = user?.role === 'colaboradora' || user?.also_collaborator === 1;
  const { data, error, isLoading } = useSWR<AchievementsPayload>(
    canUseAchievements ? '/api/collaborator/achievements' : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const achievements = data?.achievements ?? [];
  const earned = achievements.filter((achievement) => achievement.status === 'earned');
  const locked = achievements.filter((achievement) => achievement.status === 'in_progress');
  const revoked = achievements.filter((achievement) => achievement.status === 'revoked');

  if (authLoading || isLoading) {
    return (
      <FeedbackState
        kind="loading"
        title="Carregando conquistas"
        description="Estamos sincronizando apenas seus marcos privados."
      />
    );
  }

  if (!canUseAchievements) {
    return (
      <FeedbackState
        kind="denied"
        title="Conquistas indisponiveis"
        description="Este perfil nao possui acesso persistido a experiencia de colaboradora."
      />
    );
  }

  if (error) {
    return (
      <FeedbackState
        kind="error"
        title="Nao foi possivel abrir conquistas"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Conquistas"
        title="Minhas conquistas"
        description="Veja marcos privados derivados somente de objetivos e desafios aprovados."
      />

      <SummaryBand
        label="Resumo privado"
        items={[
          { label: 'Conquistadas', value: earned.length },
          { label: 'Bloqueadas', value: locked.length },
          { label: 'Revogadas', value: revoked.length },
        ]}
      />

      <section aria-labelledby="achievements-privacy-title" className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <Award size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Jornada privada
              </p>
              <h2 id="achievements-privacy-title" className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
                Marcos privados da sua jornada
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">
                As conquistas nascem apenas de marcos aprovados e nao revogados. A tela mostra seu proprio progresso e mantem tudo no espaco privado da colaboradora.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-positive)_10%,var(--platform-surface))] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--platform-ink)]">
            <ShieldCheck size={19} aria-hidden="true" />
            Privacidade da jornada
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--platform-muted)]">
            <li className="flex gap-3"><ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Somente marcos gerados por objetivos e desafios aprovados.</span></li>
            <li className="flex gap-3"><Lock size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Visivel apenas para voce.</span></li>
            <li className="flex gap-3"><Sparkles size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" /><span>Marcos sem compartilhamento publico.</span></li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="achievement-list-title" className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]">
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="achievement-list-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Marcos privados
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Os estados acompanham sua jornada privada conforme objetivos e desafios avancam.
          </p>
        </div>

        {achievements.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FeedbackState
              kind="empty"
              title="Nenhuma conquista disponivel"
              description="O catalogo privado ainda nao foi sincronizado."
            />
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
            {achievements.map((achievement) => {
              const isEarned = achievement.status === 'earned';
              return (
                <article key={achievement.id} className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5">
                  <div className="flex items-start gap-4">
                    <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-[var(--platform-radius-control)] ${isEarned ? 'bg-[var(--platform-action)] text-white' : 'bg-[var(--platform-group)] text-[var(--platform-muted)]'}`}>
                      {isEarned ? <CheckCircle2 size={21} aria-hidden="true" /> : <Lock size={21} aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--platform-ink)]">{achievement.achievement.title}</h3>
                        <span className="rounded-full border border-[var(--platform-line)] px-2 py-0.5 text-xs font-medium text-[var(--platform-muted)]">
                          {statusLabel(achievement.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">{achievement.achievement.description}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--platform-group)]" aria-label={`Progresso ${achievement.progress}%`}>
                        <div className="h-full rounded-full bg-[var(--platform-action)]" style={{ width: `${achievement.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
