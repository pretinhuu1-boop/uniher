'use client';

import useSWR from 'swr';
import type {
  AgeDistribution,
  CampaignStatus,
  ConviteStatus,
  DashboardKPI,
  Department,
  EngagementDataPoint,
  HealthRisk,
  ROIProjection,
} from '@/types/platform';

export interface DashboardApiResponse {
  kpis?: DashboardKPI[];
  departments?: Department[];
  roi?: ROIProjection;
  campaigns?: CampaignStatus[];
  engagement?: EngagementDataPoint[];
  ageDistribution?: AgeDistribution[];
  healthRisk?: HealthRisk[];
  invites?: ConviteStatus;
  reports?: unknown[];
}

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
  const response = await fetch(url);
  if (!response.ok) {
    const message = await getErrorMessage(response)
      ?? `Falha ao carregar dashboard (${response.status}).`;
    throw new DashboardHttpError(response.status, message);
  }

  return response.json() as Promise<DashboardApiResponse>;
}

export function useDashboard() {
  const { data, error, isLoading } = useSWR<DashboardApiResponse, DashboardHttpError>(
    '/api/dashboard',
    dashboardFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  return {
    kpis: data?.kpis ?? [],
    departments: data?.departments ?? [],
    roi: data?.roi ?? { roiMultiplier: 0, savings: 'R$ 0', absenteeismReduction: '—' },
    campaigns: data?.campaigns ?? [],
    engagement: data?.engagement ?? [],
    ageDistribution: data?.ageDistribution ?? [],
    healthRisk: data?.healthRisk ?? [],
    invites: data?.invites ?? { total: 0, pending: 0, accepted: 0, expired: 0 },
    reports: data?.reports ?? [],
    isLoading,
    error,
  };
}
