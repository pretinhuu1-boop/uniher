'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import type { DashboardPeriod } from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';
import { DashboardDetails, type DashboardFilters } from './components/DashboardDetails';
import { EngagementOverview } from './components/EngagementOverview';
import { NextActions } from './components/NextActions';
import { downloadDashboardCsv, hasMeaningfulDashboardData } from './dashboard-export';
import { createDashboardViewModel } from './dashboard-view-model';
import styles from './dashboard.module.css';

function assertNever(value: never): never {
  throw new Error(`Estado protegido desconhecido: ${JSON.stringify(value)}`);
}

function renderMetric(metric: ProtectedMetric<number>): string | number {
  switch (metric.status) {
    case 'visible':
      return metric.value;
    case 'suppressed':
      return 'Protegido';
    default:
      return assertNever(metric);
  }
}

interface AdminDashboardCompany {
  id: string;
  name: string;
  trade_name?: string | null;
  user_count?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('1m');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [adminCompanies, setAdminCompanies] = useState<AdminDashboardCompany[]>([]);
  const [adminCompaniesLoading, setAdminCompaniesLoading] = useState(false);
  const [adminCompaniesError, setAdminCompaniesError] = useState(false);
  const requiresCompanyScope =
    user?.role === 'admin' && user.isMasterAdmin === true && !user.companyId;
  const dashboard = useDashboard(
    activePeriod,
    departmentId || undefined,
    requiresCompanyScope ? selectedCompanyId || undefined : undefined,
  );

  useEffect(() => {
    if (user?.role !== 'rh') return;
    fetch('/api/rh/onboarding-status')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.isNewRH) router.push('/onboarding-rh');
      })
      .catch(() => undefined);
  }, [user?.role, router]);

  useEffect(() => {
    if (!requiresCompanyScope) return;
    let cancelled = false;
    setAdminCompaniesLoading(true);
    setAdminCompaniesError(false);

    fetch('/api/admin/companies?limit=200', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('companies')))
      .then((data: { companies?: AdminDashboardCompany[] }) => {
        if (cancelled) return;
        setAdminCompanies(data.companies ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setAdminCompanies([]);
        setAdminCompaniesError(true);
      })
      .finally(() => {
        if (!cancelled) setAdminCompaniesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requiresCompanyScope]);

  const model = useMemo(
    () => dashboard.data ? createDashboardViewModel(dashboard.data) : null,
    [dashboard.data],
  );
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Gestora';
  const canExport = Boolean(
    model
    && !dashboard.isLoading
    && !dashboard.error
    && hasMeaningfulDashboardData(model),
  );
  const filters: DashboardFilters = { period: activePeriod, departmentId };

  function updateFilters(nextFilters: DashboardFilters) {
    setActivePeriod(nextFilters.period);
    setDepartmentId(nextFilters.departmentId);
  }

  function selectAdminCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    setDepartmentId('');
  }

  const selectedCompany = adminCompanies.find((company) => company.id === selectedCompanyId);

  return (
    <div className={styles.page}>
      <PageHeader
        context="Visão geral · RH"
        title={`Bom dia, ${firstName}.`}
        description="Indicadores agregados com proteção de coorte."
        primaryAction={<Button onClick={() => router.push('/convites')}>Convidar</Button>}
        secondaryActions={(
          <Button
            variant="secondary"
            disabled={!canExport}
            title={canExport ? undefined : 'Aguarde o carregamento da projeção protegida.'}
            onClick={() => model && downloadDashboardCsv(model)}
          >
            Exportar CSV
          </Button>
        )}
      />
      {requiresCompanyScope ? (
        <>
          <section className={styles.surface} aria-labelledby="admin-company-scope-title">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.eyebrow}>Escopo Admin Master</p>
                <h2 id="admin-company-scope-title" className={styles.sectionTitle}>Empresa do relatório</h2>
                <p className={styles.sectionDescription}>
                  O dashboard RH só carrega agregados após uma empresa ser selecionada explicitamente.
                </p>
              </div>
              {selectedCompany ? (
                <span className={styles.stateLabel}>{selectedCompany.user_count ?? 0} usuárias</span>
              ) : null}
            </div>
            <label className={styles.companyScopeField}>
              <span>Empresa</span>
              <select
                value={selectedCompanyId}
                disabled={adminCompaniesLoading}
                onChange={(event) => selectAdminCompany(event.target.value)}
              >
                <option value="">
                  {adminCompaniesLoading ? 'Carregando empresas...' : 'Selecione uma empresa'}
                </option>
                {adminCompanies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.trade_name || company.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {!selectedCompanyId ? (
            <FeedbackState
              kind={adminCompaniesError ? 'error' : 'denied'}
              title={adminCompaniesError ? 'Não foi possível carregar as empresas' : 'Selecione uma empresa no painel master'}
              description={
                adminCompaniesError
                  ? 'Atualize a página para tentar novamente.'
                  : 'O dashboard RH usa dados agregados por empresa. Escolha uma empresa antes de visualizar esta projeção.'
              }
            />
          ) : dashboard.isLoading ? (
            <FeedbackState
              kind="loading"
              title="Preparando sua visão protegida"
              description="Aplicando os controles de privacidade à empresa selecionada."
            />
          ) : dashboard.error || !model ? (
            <FeedbackState
              kind="error"
              title="Não foi possível carregar o dashboard"
              description="Atualize a página para tentar novamente."
            />
          ) : (
            <>
              <SummaryBand
                label={`Resumo protegido - ${selectedCompany?.trade_name || selectedCompany?.name || 'empresa selecionada'}`}
                items={model.summary.map((item) => ({
                  label: item.label,
                  value: renderMetric(item.metric),
                  detail: item.detail,
                  state: item.state,
                }))}
              />
              <section className={styles.primaryGrid}>
                <EngagementOverview metric={model.metrics.engagement} />
                <NextActions actions={model.actions} />
              </section>
              <DashboardDetails model={model} filters={filters} onFiltersChange={updateFilters} />
            </>
          )}
        </>
      ) : dashboard.isLoading ? (
        <FeedbackState
          kind="loading"
          title="Preparando sua visão protegida"
          description="Aplicando os controles de privacidade ao filtro selecionado."
        />
      ) : dashboard.error || !model ? (
        <FeedbackState
          kind="error"
          title="Não foi possível carregar o dashboard"
          description="Atualize a página para tentar novamente."
        />
      ) : (
        <>
          <SummaryBand
            label="Resumo protegido da empresa"
            items={model.summary.map((item) => ({
              label: item.label,
              value: renderMetric(item.metric),
              detail: item.detail,
              state: item.state,
            }))}
          />
          <section className={styles.primaryGrid}>
            <EngagementOverview metric={model.metrics.engagement} />
            <NextActions actions={model.actions} />
          </section>
          <DashboardDetails model={model} filters={filters} onFiltersChange={updateFilters} />
        </>
      )}
    </div>
  );
}
