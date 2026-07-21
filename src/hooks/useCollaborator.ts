'use client';
import { useEffect } from 'react';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import type { CommunityFeedResponse } from '@/types/community';

export const COLLABORATOR_FEED_KEY = '/api/collaborator/feed?scope=company&limit=20';
export const COLLABORATOR_SAVED_KEY = '/api/collaborator/saved?limit=20';

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

function isAuthorizationError(error: unknown): error is { status: 401 | 403 } {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  return error.status === 401 || error.status === 403;
}

function useCommunityResponse(
  key: string,
  configuration: SWRConfiguration<CommunityFeedResponse, CollaboratorApiError>,
) {
  const response = useSWR<CommunityFeedResponse, CollaboratorApiError>(key, getFetcher, configuration);
  const authorizationError = isAuthorizationError(response.error);

  useEffect(() => {
    if (authorizationError) {
      void response.mutate(undefined, { revalidate: false });
    }
  }, [authorizationError, response.mutate]);

  return {
    ...response,
    data: authorizationError ? undefined : response.data,
  };
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
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error, isLoading, mutate } = useCommunityResponse(
    COLLABORATOR_FEED_KEY,
    {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
    dedupingInterval: 20_000,
    },
  );

  const changeSupport = async (id: string, method: 'POST' | 'DELETE') => {
    const encodedId = encodeURIComponent(id);
    const state = await mutateCommunity<SupportState>(`/api/collaborator/feed/${encodedId}/support`, method);
    await mutateCache(COLLABORATOR_FEED_KEY);
    return state;
  };
  const changeSave = async (id: string, method: 'POST' | 'DELETE') => {
    const encodedId = encodeURIComponent(id);
    const state = await mutateCommunity<SaveState>(`/api/collaborator/feed/${encodedId}/save`, method);
    await Promise.all([
      mutateCache(COLLABORATOR_FEED_KEY),
      mutateCache(COLLABORATOR_SAVED_KEY),
    ]);
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
  const { data, error, isLoading, mutate } = useCommunityResponse(
    COLLABORATOR_SAVED_KEY,
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
