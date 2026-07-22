import type { ReactNode } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { FeedbackState } from '@/components/ui/FeedbackState';
import PageHeader from '@/components/platform/PageHeader';

export interface ContainedSurfaceStep {
  title: string;
  description: string;
  icon: ReactNode;
}

export interface ContainedSurfacePreviewProps {
  context: string;
  title: string;
  description: string;
  stateTitle: string;
  stateDescription: string;
  intentTitle: string;
  intentDescription: string;
  steps: ContainedSurfaceStep[];
  allowedItems: string[];
  blockedItems: string[];
}

export function ContainedSurfacePreview({
  context,
  title,
  description,
  stateTitle,
  stateDescription,
  intentTitle,
  intentDescription,
  steps,
  allowedItems,
  blockedItems,
}: ContainedSurfacePreviewProps) {
  return (
    <div className="space-y-6">
      <PageHeader context={context} title={title} description={description} />

      <section
        aria-labelledby="surface-intent-title"
        className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
      >
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
              <ShieldCheck size={24} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--platform-action-strong)]">
                Desenho aprovado para a próxima etapa
              </p>
              <h2 id="surface-intent-title" className="mt-2 text-xl font-semibold text-[var(--platform-ink)]">
                {intentTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--platform-muted)]">
                {intentDescription}
              </p>
            </div>
          </div>
        </div>

        <FeedbackState kind="denied" title={stateTitle} description={stateDescription} />
      </section>

      <section
        aria-labelledby="surface-flow-title"
        className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)]"
      >
        <div className="border-b border-[var(--platform-line)] px-5 py-4 sm:px-6">
          <h2 id="surface-flow-title" className="text-lg font-semibold text-[var(--platform-ink)]">
            Como esta página vai funcionar
          </h2>
          <p className="mt-1 text-sm text-[var(--platform-muted)]">
            Estrutura visual pronta para receber o domínio seguro quando o gate correspondente passar.
          </p>
        </div>
        <ol className="grid gap-0 divide-y divide-[var(--platform-line)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {steps.map((step, index) => (
            <li key={step.title} className="min-w-0 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
                  {step.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--platform-muted)]">
                    Etapa {index + 1}
                  </p>
                  <h3 className="mt-1 font-semibold text-[var(--platform-ink)]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--platform-muted)]">{step.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Limites da superficie">
        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[var(--platform-surface)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--platform-ink)]">Permitido nesta etapa</h2>
          <ul className="mt-4 space-y-3">
            {allowedItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--platform-muted)]">
                <ShieldCheck size={18} className="mt-1 flex-none text-[var(--platform-positive)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--platform-radius-surface)] border border-[var(--platform-line)] bg-[color-mix(in_srgb,var(--platform-warning)_10%,var(--platform-surface))] p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--platform-ink)]">
            <LockKeyhole size={19} aria-hidden="true" />
            Permanece bloqueado
          </h2>
          <ul className="mt-4 space-y-3">
            {blockedItems.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--platform-muted)]">
                <LockKeyhole size={18} className="mt-1 flex-none text-[var(--platform-warning)]" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
