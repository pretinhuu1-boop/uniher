import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FeedbackStateProps {
  kind: 'loading' | 'empty' | 'error' | 'denied';
  title: string;
  description: string;
  action?: ReactNode;
}

const stateClasses: Record<FeedbackStateProps['kind'], string> = {
  loading: 'border-[var(--platform-line)] bg-[var(--platform-group)]',
  empty: 'border-[var(--platform-line)] bg-[var(--platform-surface)]',
  error: 'border-[var(--platform-critical)] bg-[var(--platform-surface)]',
  denied: 'border-[var(--platform-critical)] bg-[var(--platform-surface)]',
};

export function FeedbackState({ kind, title, description, action }: FeedbackStateProps) {
  const isAlert = kind === 'error' || kind === 'denied';

  return (
    <section
      aria-busy={kind === 'loading' || undefined}
      className={cn(
        'flex min-h-44 flex-col items-start justify-center gap-3 rounded-[var(--platform-radius-surface)] border p-6 text-[var(--platform-ink)]',
        stateClasses[kind],
      )}
      data-state={kind}
      role={isAlert ? 'alert' : 'status'}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-[var(--platform-muted)]">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </section>
  );
}
