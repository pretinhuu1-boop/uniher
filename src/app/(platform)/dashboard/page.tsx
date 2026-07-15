'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardDetails, type DashboardFilters, type DashboardPeriod } from './components/DashboardDetails';
import { EngagementOverview } from './components/EngagementOverview';
import { NextActions } from './components/NextActions';
import { downloadDashboardCsv, hasMeaningfulDashboardData } from './dashboard-export';
import { createDashboardViewModel } from './dashboard-view-model';
import styles from './dashboard.module.css';

const PERIOD_POINTS: Record<DashboardPeriod, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1a': 12,
};

export default function DashboardPage() {
  const dashboard = useDashboard();
  const { user } = useAuth();
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('1m');
  const [filterDept, setFilterDept] = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  useEffect(() => {
    if (user?.role !== 'rh') return;
    fetch('/api/rh/onboarding-status')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.isNewRH) router.push('/onboarding-rh');
      })
      .catch(() => undefined);
  }, [user?.role, router]);

  const model = useMemo(() => createDashboardViewModel({
    kpis: dashboard.kpis,
    departments: dashboard.departments,
    roi: dashboard.roi,
    campaigns: dashboard.campaigns,
    engagement: dashboard.engagement,
    ageDistribution: dashboard.ageDistribution,
  }), [dashboard.ageDistribution, dashboard.campaigns, dashboard.departments, dashboard.engagement, dashboard.kpis, dashboard.roi]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Gestora';
  const canExport = !dashboard.isLoading
    && !dashboard.error
    && hasMeaningfulDashboardData(model);
  const filters: DashboardFilters = {
    period: activePeriod,
    department: filterDept,
    attention: filterHealth,
  };

  function updateFilters(nextFilters: DashboardFilters) {
    setActivePeriod(nextFilters.period);
    setFilterDept(nextFilters.department);
    setFilterHealth(nextFilters.attention);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        context="Visão geral · RH"
        title={`Bom dia, ${firstName}.`}
        description="O que merece sua atenção hoje."
        primaryAction={<Button onClick={() => router.push('/convites')}>Convidar</Button>}
        secondaryActions={(
          <Button
            variant="secondary"
            disabled={!canExport}
            title={canExport ? undefined : 'A exportação estará disponível quando houver dados carregados.'}
            onClick={() => downloadDashboardCsv(model)}
          >
            Exportar CSV
          </Button>
        )}
      />
      {dashboard.isLoading ? (
        <FeedbackState
          kind="loading"
          title="Preparando sua visão geral"
          description="Organizando indicadores agregados e próximas ações."
        />
      ) : dashboard.error ? (
        <FeedbackState
          kind="error"
          title="Não foi possível carregar o dashboard"
          description="Atualize a página para tentar buscar os indicadores novamente."
        />
      ) : (
        <>
          <SummaryBand label="Resumo da empresa" items={model.summary} />
          <section className={styles.primaryGrid}>
            <EngagementOverview data={model.engagement.slice(-PERIOD_POINTS[activePeriod])} />
            <NextActions actions={model.actions} />
          </section>
          <DashboardDetails model={model} filters={filters} onFiltersChange={updateFilters} />
        </>
      )}
    </div>
  );
}
