'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { PageHeader } from '@/components/platform/PageHeader';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/hooks/useAuth';
import { COMMUNICATION_PERIODS } from '@/types/platform';
import type {
  CommunicationPeriod,
  ProtectedCommunicationsProjection,
} from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';
import styles from './analytics.module.css';

function assertNever(value: never): never {
  throw new Error(`Estado protegido desconhecido: ${JSON.stringify(value)}`);
}

function renderMetric(metric: ProtectedMetric<number>): string {
  switch (metric.status) {
    case 'visible':
      return String(metric.value);
    case 'suppressed':
      return metric.message;
    default:
      return assertNever(metric);
  }
}

async function communicationsFetcher(endpoint: string): Promise<ProtectedCommunicationsProjection> {
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível consultar as comunicações protegidas.');
  return response.json() as Promise<ProtectedCommunicationsProjection>;
}

export default function AnalyticsEmailsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<CommunicationPeriod>('30');
  const endpoint = `/api/analytics/communications?period=${period}`;
  const key = user?.companyId && user.role
    ? ['protected-report', endpoint, user.companyId, user.role, period] as const
    : null;
  const { data, error, isLoading } = useSWR<ProtectedCommunicationsProjection>(
    key,
    () => communicationsFetcher(endpoint),
    {
      revalidateOnFocus: true,
      dedupingInterval: 0,
      keepPreviousData: false,
    },
  );

  return (
    <div className={styles.page}>
      <PageHeader
        context="Operação · RH"
        title="Entregas de comunicação"
        description="Somente metadados operacionais agregados e protegidos são exibidos."
      />
      <label>
        Período
        <select value={period} onChange={(event) => setPeriod(event.target.value as CommunicationPeriod)}>
          {COMMUNICATION_PERIODS.map((value) => (
            <option key={value} value={value}>{value} dias</option>
          ))}
        </select>
      </label>
      {isLoading ? (
        <FeedbackState
          kind="loading"
          title="Preparando metadados protegidos"
          description="Aplicando o limiar de privacidade ao período selecionado."
        />
      ) : error ? (
        <FeedbackState
          kind="error"
          title="Não foi possível carregar as entregas"
          description="Atualize a página para tentar novamente."
        />
      ) : (
        <section aria-label="Métricas operacionais protegidas">
          {data?.actions.map((item) => (
            <article key={item.action}>
              <h2>{item.label}</h2>
              <p>{renderMetric(item.metric)}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
