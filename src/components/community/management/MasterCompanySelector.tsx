import { Building2, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { EditorialCompany } from './types';

interface MasterCompanySelectorProps {
  companies: EditorialCompany[];
  selectedCompanyId: string;
  isLoading: boolean;
  error: string;
  onChange: (companyId: string) => void;
  onRetry: () => void;
}

function isActiveCompany(company: EditorialCompany): boolean {
  return company.is_active === true || company.is_active === 1;
}

export function getEditorialCompanyName(company: EditorialCompany): string {
  return company.trade_name?.trim() || company.name;
}

export function MasterCompanySelector({
  companies,
  selectedCompanyId,
  isLoading,
  error,
  onChange,
  onRetry,
}: MasterCompanySelectorProps) {
  const activeCompanies = companies.filter(isActiveCompany);
  const hasActiveCompanies = activeCompanies.length > 0;

  return (
    <section
      aria-labelledby="master-company-selector-title"
      className="border-y border-[var(--platform-line)] bg-[var(--platform-surface)] px-4 py-4 sm:px-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--platform-radius-control)] bg-[var(--platform-group)] text-[var(--platform-action-strong)]">
          <Building2 aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 id="master-company-selector-title" className="text-sm font-semibold text-[var(--platform-ink)]">
                Empresa para gestão editorial
              </h2>
              <p className="mt-0.5 text-xs text-[var(--platform-muted)]">
                Selecione uma empresa ativa antes de consultar ou alterar conteúdos.
              </p>
            </div>
            {error && (
              <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="w-full gap-2 sm:w-auto">
                <RefreshCw aria-hidden="true" className="h-4 w-4" />Tentar novamente
              </Button>
            )}
          </div>

          <div className="mt-3 max-w-xl">
            <label htmlFor="master-editorial-company" className="mb-1.5 block text-xs font-medium text-[var(--platform-muted)]">
              Empresa selecionada
            </label>
            <div className="relative">
              {isLoading ? (
                <LoaderCircle aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 animate-spin text-[var(--platform-muted)]" />
              ) : (
                <Building2 aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--platform-muted)]" />
              )}
              <select
                id="master-editorial-company"
                value={selectedCompanyId}
                onChange={(event) => onChange(event.target.value)}
                disabled={isLoading || Boolean(error) || !hasActiveCompanies}
                aria-describedby={error ? 'master-company-error' : !isLoading && !hasActiveCompanies ? 'master-company-empty' : 'master-company-help'}
                className="h-11 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] pl-9 pr-9 text-sm text-[var(--platform-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] disabled:cursor-not-allowed disabled:bg-[var(--platform-group)] disabled:opacity-75"
              >
                <option value="">
                  {isLoading ? 'Carregando empresas...' : hasActiveCompanies ? 'Selecione uma empresa' : 'Nenhuma empresa ativa disponível'}
                </option>
                {companies.map((company) => {
                  const active = isActiveCompany(company);
                  return (
                    <option key={company.id} value={company.id} disabled={!active}>
                      {getEditorialCompanyName(company)}{active ? '' : ' (suspensa)'}
                    </option>
                  );
                })}
              </select>
            </div>
            {error ? (
              <p id="master-company-error" role="alert" className="mt-2 text-xs font-medium text-[var(--platform-critical)]">{error}</p>
            ) : !isLoading && !hasActiveCompanies ? (
              <p id="master-company-empty" role="status" className="mt-2 text-xs text-[var(--platform-muted)]">
                Não há empresa ativa disponível para gestão editorial.
              </p>
            ) : (
              <p id="master-company-help" className="mt-2 text-xs text-[var(--platform-muted)]">
                O escopo selecionado será aplicado à listagem, criação, edição, publicação e arquivamento.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
