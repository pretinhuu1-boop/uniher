'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCollaboratorHome() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return { data: data ?? null, isLoading, mutate };
}

export function useCollaboratorBadges() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator/badges', fetcher, {
    revalidateOnFocus: false,
  });
  return { badges: data ?? [], isLoading, mutate };
}

export function useCollaboratorChallenges() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator/challenges', fetcher, {
    revalidateOnFocus: false,
  });
  return { challenges: data ?? [], isLoading, mutate };
}

export function useDailyMissions() {
  const { data, isLoading, mutate } = useSWR('/api/gamification/daily-missions', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000, // 1 minute
  });
  return { missions: data?.missions ?? [], isLoading, mutate };
}

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  return { notifications: data ?? [], isLoading, mutate };
}

export function useCollaboratorFeed(scope: 'company' | 'group' = 'company') {
  const { data, isLoading, mutate } = useSWR(`/api/collaborator/feed?scope=${scope}&limit=20`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    dedupingInterval: 20_000,
  });
  return {
    items: data?.items ?? [],
    settings: data?.settings ?? { companyFeedEnabled: true },
    scope: data?.scope ?? scope,
    isLoading,
    mutate,
  };
}
