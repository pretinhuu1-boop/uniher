import type { ReactNode } from 'react';

export interface PageHeaderProps {
  context?: string;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
}

export function PageHeader({
  context,
  title,
  description,
  primaryAction,
  secondaryActions,
}: PageHeaderProps) {
  const hasActions = primaryAction || secondaryActions;

  return (
    <header className="flex flex-col gap-5 border-b border-[var(--platform-line)] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1">
        {context && (
          <p className="text-sm font-medium text-[var(--platform-action-strong)]">{context}</p>
        )}
        <h1 className="text-2xl font-semibold text-[var(--platform-ink)] md:text-3xl">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-[var(--platform-muted)]">{description}</p>}
      </div>
      {hasActions && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {secondaryActions && (
            <div
              role="group"
              aria-label="Ações secundárias"
              data-action-region="secondary"
              className="flex flex-wrap items-center gap-2"
            >
              {secondaryActions}
            </div>
          )}
          {primaryAction && (
            <div role="group" aria-label="Ação principal" data-action-region="primary">
              {primaryAction}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
