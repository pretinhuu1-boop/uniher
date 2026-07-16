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
      return metric.message;
    default:
      return assertNever(metric);
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('1m');
  const [departmentId, setDepartmentId] = useState('');
  const dashboard = useDashboard(activePeriod, departmentId || undefined);

  useEffect(() => {
    if (user?.role !== 'rh') return;
    fetch('/api/rh/onboarding-status')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.isNewRH) router.push('/onboarding-rh');
      })
      .catch(() => undefined);
  }, [user?.role, router]);

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

  return (
    <div className={styles.page}>
      <PageHeader
        context="Vis\u00e3o geral \u00b7 RH"
        title={`Bom dia, ${firstName}.`}
        description="Indicadores agregados com prote\u00e7\u00e3o de coorte."
        primaryAction={<Button onClick={() => router.push('/convites')}>Convidar</Button>}
        secondaryActions={(
          <Button
            variant="secondary"
            disabled={!canExport}
            title={canExport ? undefined : 'Aguarde o carregamento da proje\u00e7\u00e3o protegida.'}
            onClick={() => model && downloadDashboardCsv(model)}
          >
            Exportar CSV
          </Button>
        )}
      />
      {dashboard.isLoading ? (
        <FeedbackState
          kind="loading"
          title="Preparando sua vis\u00e3o protegida"
          description="Aplicando os controles de privacidade ao filtro selecionado."
        />
      ) : dashboard.error || !model ? (
        <FeedbackState
          kind="error"
          title="N\u00e3o foi poss\u00edvel carregar o dashboard"
          description="Atualize a p\u00e1gina para tentar novamente."
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
