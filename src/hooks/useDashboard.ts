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

export function buildDashboardEndpoint(
  period: DashboardPeriod,
  departmentId?: string,
  companyId?: string,
): string {
  const params = new URLSearchParams({ period });
  if (departmentId) params.set('departmentId', departmentId);
  if (companyId) params.set('companyId', companyId);
  return `/api/dashboard?${params.toString()}`;
}

export function useDashboard(period: DashboardPeriod, departmentId?: string, companyId?: string) {
  const { user } = useAuth();
  const endpoint = buildDashboardEndpoint(period, departmentId, companyId);
  const sessionCompanyId = user?.companyId || undefined;
  const effectiveCompanyId = sessionCompanyId ?? companyId;
  const key = effectiveCompanyId && user?.role
    ? ['protected-report', endpoint, effectiveCompanyId, user.role, period, departmentId ?? 'all'] as const
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
