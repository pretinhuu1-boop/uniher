import { cn } from '@/lib/utils';

export type SummaryBandState = 'neutral' | 'positive' | 'warning' | 'critical';

export interface SummaryItem {
  label: string;
  value: string | number;
  detail?: string;
  state?: SummaryBandState;
}

export interface SummaryBandProps {
  label: string;
  items: SummaryItem[];
}

const stateClasses: Record<SummaryBandState, string> = {
  neutral: 'text-[var(--platform-ink)]',
  positive: 'text-[var(--platform-positive)]',
  warning: 'text-[var(--platform-ink)]',
  critical: 'text-[var(--platform-critical)]',
};

export function SummaryBand({ label, items }: SummaryBandProps) {
  return (
    <section
      aria-label={label}
      className="rounded-[var(--platform-radius-surface)] bg-[var(--platform-group)] px-4 py-3"
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const state = item.state || 'neutral';

          return (
            <div key={item.label} data-state={state} className="min-w-0 px-2 py-2 sm:px-3 sm:first:pl-0 sm:last:pr-0">
              <dt className="text-xs font-medium text-[var(--platform-muted)]">{item.label}</dt>
              <dd className={cn('mt-1 flex min-w-0 flex-col gap-1 text-xl font-semibold leading-tight', stateClasses[state])}>
                <span className="min-w-0 break-words">{item.value}</span>
                {item.detail && (
                  <span className="text-xs font-normal leading-snug text-[var(--platform-muted)]">
                    {item.detail}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
