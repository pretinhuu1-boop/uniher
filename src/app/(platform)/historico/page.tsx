'use client';

import { useState } from 'react';
import useSWR from 'swr';

import { PageHeader } from '@/components/platform/PageHeader';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useAuth } from '@/hooks/useAuth';
import { HISTORY_PERIODS } from '@/types/platform';
import type { HistoryPeriod, UnavailableHistoryProjection } from '@/types/platform';
import styles from './historico.module.css';

async function historyFetcher(endpoint: string): Promise<UnavailableHistoryProjection> {
  const response = await fetch(endpoint, { cache: 'no-store' });
  const body = await response.json() as UnavailableHistoryProjection | { error?: string };
  if (response.status === 410) return body as UnavailableHistoryProjection;
  if (!response.ok) throw new Error('N\u00e3o foi poss\u00edvel consultar o hist\u00f3rico protegido.');
  return body as UnavailableHistoryProjection;
}

export default function HistoricoPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<HistoryPeriod>('6');
  const departmentId = '';
  const endpoint = `/api/analytics/history?period=${period}`;
  const key = user?.companyId && user.role
    ? ['protected-report', endpoint, user.companyId, user.role, period, departmentId || 'all'] as const
    : null;
  const { data, error, isLoading } = useSWR<UnavailableHistoryProjection>(
    key,
    () => historyFetcher(endpoint),
    {
      revalidateOnFocus: true,
      dedupingInterval: 0,
      keepPreviousData: false,
    },
  );

  return (
    <div className={styles.page}>
      <PageHeader
        context="Privacidade · RH"
        title="Histórico protegido"
        description="A evolução só será exibida quando houver um registro elegível para agregação."
      />
      <label>
        Período
        <select value={period} onChange={(event) => setPeriod(event.target.value as HistoryPeriod)}>
          {HISTORY_PERIODS.map((value) => (
            <option key={value} value={value}>{value} meses</option>
          ))}
        </select>
      </label>
      {isLoading ? (
        <FeedbackState
          kind="loading"
          title="Verificando disponibilidade"
          description="Validando o registro protegido para este escopo."
        />
      ) : error ? (
        <FeedbackState
          kind="error"
          title="Não foi possível consultar o histórico"
          description="Atualize a página para tentar novamente."
        />
      ) : (
        <FeedbackState
          kind="empty"
          title="Histórico indisponível"
          description={data?.message ?? 'O registro eleg\u00edvel ainda n\u00e3o est\u00e1 dispon\u00edvel.'}
        />
      )}
    </div>
  );
}
