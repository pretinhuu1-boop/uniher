'use client';

import useSWR from 'swr';

import { useAuth } from '@/hooks/useAuth';
import type {
  DashboardPeriod,
  ProtectedDashboardProjection,
} from '@/types/platform';

export type DashboardApiResponse = ProtectedDashboardProjection;

export class DashboardHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'DashboardHttpError';
  }
}

async function getErrorMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object'
      && body !== null
      && 'error' in body
      && typeof body.error === 'string'
    ) {
      return body.error;
    }
  } catch {
    return null;
  }
  return null;
}

export async function dashboardFetcher(url: string): Promise<DashboardApiResponse> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const message = await getErrorMessage(response)
      ?? `Falha ao carregar dashboard (${response.status}).`;
    throw new DashboardHttpError(response.status, message);
  }
  return response.json() as Promise<DashboardApiResponse>;
}

export function useDashboard(period: DashboardPeriod, departmentId?: string) {
  const { user } = useAuth();
  const params = new URLSearchParams({ period });
  if (departmentId) params.set('departmentId', departmentId);
  const endpoint = `/api/dashboard?${params.toString()}`;
  const key = user?.companyId && user.role
    ? ['protected-report', endpoint, user.companyId, user.role, period, departmentId ?? 'all'] as const
    : null;

  const { data, error, isLoading } = useSWR<DashboardApiResponse, DashboardHttpError>(
    key,
    () => dashboardFetcher(endpoint),
    {
      revalidateOnFocus: true,
      dedupingInterval: 0,
      keepPreviousData: false,
    },
  );

  return { data, isLoading, error };
}
