'use client';
import useSWR from 'swr';
import { COLLABORATOR_HOME, BADGES, CHALLENGES, NOTIFICATIONS } from '@/data/mock-collaborator';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCollaboratorHome() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return { data: data ?? COLLABORATOR_HOME, isLoading, mutate };
}

export function useCollaboratorBadges() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator/badges', fetcher, {
    revalidateOnFocus: false,
  });
  return { badges: data ?? BADGES, isLoading, mutate };
}

export function useCollaboratorChallenges() {
  const { data, isLoading, mutate } = useSWR('/api/collaborator/challenges', fetcher, {
    revalidateOnFocus: false,
  });
  return { challenges: data ?? CHALLENGES, isLoading, mutate };
}

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR('/api/notifications', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  return { notifications: data ?? NOTIFICATIONS, isLoading, mutate };
}
