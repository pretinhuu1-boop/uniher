'use client';
import useSWR from 'swr';
import {
  DASHBOARD_KPIS,
  DEPARTMENTS,
  ROI_DATA,
  CAMPAIGNS_DASHBOARD,
  ENGAGEMENT_OVER_TIME,
  AGE_DISTRIBUTION,
  HEALTH_RISK_EVOLUTION,
  CONVITES,
  REPORTS,
} from '@/data/mock-dashboard';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDashboard() {
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  return {
    kpis: data?.kpis ?? DASHBOARD_KPIS,
    departments: data?.departments ?? DEPARTMENTS,
    roi: data?.roi ?? ROI_DATA,
    campaigns: data?.campaigns ?? CAMPAIGNS_DASHBOARD,
    engagement: data?.engagement ?? ENGAGEMENT_OVER_TIME,
    ageDistribution: data?.ageDistribution ?? AGE_DISTRIBUTION,
    healthRisk: data?.healthRisk ?? HEALTH_RISK_EVOLUTION,
    invites: data?.invites ?? CONVITES,
    reports: data?.reports ?? REPORTS,
    isLoading,
    error,
  };
}
