'use client';
import useSWR from 'swr';
import type { CommunityFeedResponse } from '@/types/community';

class CollaboratorApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(code ?? `Collaborator API request failed with status ${status}`);
    this.name = 'CollaboratorApiError';
  }
}

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null) as { code?: string } | null;
  if (!response.ok) throw new CollaboratorApiError(response.status, payload?.code);
  return payload as T;
}

const getFetcher = <T,>(url: string) => fetcher<T>(url);

type SupportState = { supportCount: number; supportedByMe: boolean };
type SaveState = { savedByMe: boolean };

async function mutateCommunity<T>(path: string, method: 'POST' | 'DELETE'): Promise<T> {
  return fetcher<T>(path, { method });
}

export function useCollaboratorHome() {
  const { data, isLoading, mutate } = useSWR<unknown>('/api/collaborator', getFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });
  return { data: data ?? null, isLoading, mutate };
}

export function useCollaboratorBadges() {
  const { data, isLoading, mutate } = useSWR<unknown[]>('/api/collaborator/badges', getFetcher, {
    revalidateOnFocus: false,
  });
  return { badges: data ?? [], isLoading, mutate };
}

export function useCollaboratorChallenges() {
  const { data, isLoading, mutate } = useSWR<unknown[]>('/api/collaborator/challenges', getFetcher, {
    revalidateOnFocus: false,
  });
  return { challenges: data ?? [], isLoading, mutate };
}

export function useDailyMissions() {
  const { data, isLoading, mutate } = useSWR<{ missions?: unknown[] }>('/api/gamification/daily-missions', getFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000, // 1 minute
  });
  return { missions: data?.missions ?? [], isLoading, mutate };
}

export function useNotifications() {
  const { data, isLoading, mutate } = useSWR<unknown[]>('/api/notifications', getFetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  return { notifications: data ?? [], isLoading, mutate };
}

export function useCollaboratorFeed() {
  const { data, error, isLoading, mutate } = useSWR<CommunityFeedResponse>(
    '/api/collaborator/feed?scope=company&limit=20',
    getFetcher,
    {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    dedupingInterval: 20_000,
    },
  );

  const changeSupport = async (id: string, method: 'POST' | 'DELETE') => {
    const state = await mutateCommunity<SupportState>(`/api/collaborator/feed/${id}/support`, method);
    await mutate();
    return state;
  };
  const changeSave = async (id: string, method: 'POST' | 'DELETE') => {
    const state = await mutateCommunity<SaveState>(`/api/collaborator/feed/${id}/save`, method);
    await mutate();
    return state;
  };

  return {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
    settings: data?.settings ?? { companyFeedEnabled: false },
    scope: data?.scope ?? 'company',
    error,
    isLoading,
    mutate,
    support: (id: string) => changeSupport(id, 'POST'),
    unsupport: (id: string) => changeSupport(id, 'DELETE'),
    save: (id: string) => changeSave(id, 'POST'),
    unsave: (id: string) => changeSave(id, 'DELETE'),
  };
}

export function useCollaboratorSaved() {
  const { data, error, isLoading, mutate } = useSWR<CommunityFeedResponse>(
    '/api/collaborator/saved?limit=20',
    getFetcher,
    { revalidateOnFocus: false },
  );

  return {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
    settings: data?.settings ?? { companyFeedEnabled: false },
    error,
    isLoading,
    mutate,
  };
}
