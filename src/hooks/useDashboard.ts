'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useDashboard() {
  const { data, error, isLoading } = useSWR('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

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
