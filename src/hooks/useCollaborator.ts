'use client';
import { useCallback, useEffect, useMemo } from 'react';
import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useAuth } from '@/hooks/useAuth';
import type { CommunityFeedItem, CommunityFeedResponse, CommunityTopic } from '@/types/community';

export const COLLABORATOR_FEED_KEY = '/api/collaborator/feed?scope=company&limit=20';
export const COLLABORATOR_SAVED_KEY = '/api/collaborator/saved?limit=20';

export type CollaboratorSavedSessionKey = readonly [
  userId: string,
  companyId: string | null,
  role: string,
  capability: 0 | 1,
];

export type CollaboratorSavedCacheKey = readonly [
  typeof COLLABORATOR_SAVED_KEY,
  ...CollaboratorSavedSessionKey,
];

export function buildCollaboratorSavedKey(
  sessionKey: CollaboratorSavedSessionKey,
): CollaboratorSavedCacheKey {
  return [COLLABORATOR_SAVED_KEY, ...sessionKey];
}

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
export type CommunitySupportersResponse = { names: string[]; nextCursor: string | null };
export type CommunityBrand = { name: string; logoUrl: string | null };

type CompanyResponse = {
  company?: {
    name?: string;
    trade_name?: string | null;
    logo_url?: string | null;
  };
};

async function mutateCommunity<T>(path: string, method: 'POST' | 'DELETE'): Promise<T> {
  return fetcher<T>(path, { method });
}

function isAuthorizationError(error: unknown): error is { status: 401 | 403 } {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  return error.status === 401 || error.status === 403;
}

function getSavedSessionKey(
  user: ReturnType<typeof useAuth>['user'],
): CollaboratorSavedSessionKey | null {
  if (!user) return null;
  const canUseCollaboratorCommunity = user.role === 'colaboradora' || user.also_collaborator === 1;
  return [
    user.id,
    user.companyId ?? null,
    user.role,
    canUseCollaboratorCommunity ? 1 : 0,
  ];
}

export function buildCollaboratorFeedKey(topic?: CommunityTopic, cursor?: string | null): string {
  const topicQuery = topic ? `&topic=${encodeURIComponent(topic)}` : '';
  const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return `${COLLABORATOR_FEED_KEY}${topicQuery}${cursorQuery}`;
}

export function mergeCommunityFeedPages(pages: CommunityFeedResponse[] = []): CommunityFeedItem[] {
  const itemsById = new Map<string, CommunityFeedItem>();
  for (const page of pages) {
    for (const item of page.items) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item);
    }
  }
  return [...itemsById.values()];
}

function patchCommunityFeedPages(
  pages: CommunityFeedResponse[] | undefined,
  postId: string,
  patch: Partial<Pick<CommunityFeedItem, 'supportCount' | 'supportedByMe' | 'savedByMe'>>,
): CommunityFeedResponse[] | undefined {
  return pages?.map((page) => ({
    ...page,
    items: page.items.map((item) => item.id === postId ? { ...item, ...patch } : item),
  }));
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
  const { user } = useAuth();
  const { mutate: mutateCache } = useSWRConfig();
  const savedSessionKey = getSavedSessionKey(user);
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
      savedSessionKey ? mutateCache(buildCollaboratorSavedKey(savedSessionKey)) : Promise.resolve(),
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

export function useCommunityBrand() {
  const { user } = useAuth();
  const brandKey = user
    ? ['/api/company', user.id, user.companyId ?? null, user.role] as const
    : null;
  const { data, error, isLoading, mutate } = useSWR<CompanyResponse, CollaboratorApiError>(
    brandKey,
    (key) => getFetcher<CompanyResponse>(key[0]),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );
  const company = data?.company;
  const name = company?.trade_name?.trim() || company?.name?.trim() || '';

  return {
    brand: name ? { name, logoUrl: company?.logo_url ?? null } : null,
    error,
    isLoading,
    retry: mutate,
  };
}

export function useCollaboratorCommunityFeed(topic?: CommunityTopic) {
  const { user } = useAuth();
  const { mutate: mutateCache } = useSWRConfig();
  const cacheScope = user
    ? JSON.stringify([user.id, user.companyId ?? null, user.role])
    : 'unauthenticated';
  const savedSessionKey = getSavedSessionKey(user);
  const getKey = useCallback((pageIndex: number, previousPage: CommunityFeedResponse | null) => {
    if (previousPage && !previousPage.nextCursor) return null;
    return [
      buildCollaboratorFeedKey(topic, pageIndex === 0 ? null : previousPage?.nextCursor),
      cacheScope,
    ] as const;
  }, [cacheScope, topic]);
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<CommunityFeedResponse, CollaboratorApiError>(
    getKey,
    (key) => getFetcher<CommunityFeedResponse>(key[0]),
    {
    revalidateFirstPage: true,
    revalidateOnFocus: false,
    dedupingInterval: 20_000,
    },
  );
  const authorizationError = isAuthorizationError(error);
  const pages = data ?? [];
  const visiblePages = authorizationError ? [] : pages;
  const items = useMemo(() => mergeCommunityFeedPages(visiblePages), [visiblePages]);
  const lastPage = visiblePages.at(-1);
  const nextCursor = lastPage?.nextCursor ?? null;
  const settings = visiblePages[0]?.settings ?? { companyFeedEnabled: false };
  const isLoadingMore = isValidating && pages.length > 0 && size > pages.length;

  useEffect(() => {
    if (authorizationError) void mutate(undefined, { revalidate: false });
  }, [authorizationError, mutate]);

  const updateSupport = async (id: string, method: 'POST' | 'DELETE') => {
    const encodedId = encodeURIComponent(id);
    const state = await mutateCommunity<SupportState>(`/api/collaborator/feed/${encodedId}/support`, method);
    await mutate(
      (current) => patchCommunityFeedPages(current, id, state),
      { revalidate: false },
    );
    return state;
  };

  const updateSave = async (id: string, method: 'POST' | 'DELETE') => {
    const encodedId = encodeURIComponent(id);
    const state = await mutateCommunity<SaveState>(`/api/collaborator/feed/${encodedId}/save`, method);
    await mutate(
      (current) => patchCommunityFeedPages(current, id, state),
      { revalidate: false },
    );
    if (savedSessionKey) await mutateCache(buildCollaboratorSavedKey(savedSessionKey));
    return state;
  };

  const loadSupporters = async (id: string, cursor?: string): Promise<CommunitySupportersResponse> => {
    const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    return fetcher<CommunitySupportersResponse>(
      `/api/collaborator/feed/${encodeURIComponent(id)}/supporters?limit=20${cursorQuery}`,
    );
  };

  return {
    items,
    nextCursor,
    settings,
    error,
    isLoading,
    isLoadingMore,
    retry: mutate,
    loadMore: async () => {
      if (!nextCursor || isValidating) return;
      await setSize(size + 1);
    },
    support: (id: string) => updateSupport(id, 'POST'),
    unsupport: (id: string) => updateSupport(id, 'DELETE'),
    save: (id: string) => updateSave(id, 'POST'),
    unsave: (id: string) => updateSave(id, 'DELETE'),
    loadSupporters,
  };
}

export function useCollaboratorSaved({
  sessionKey,
  enabled,
}: {
  sessionKey: CollaboratorSavedSessionKey | null;
  enabled: boolean;
}) {
  const key = enabled && sessionKey ? buildCollaboratorSavedKey(sessionKey) : null;
  const response = useSWR<CommunityFeedResponse, CollaboratorApiError>(
    key,
    (cacheKey) => getFetcher<CommunityFeedResponse>(cacheKey[0]),
    { revalidateOnFocus: false },
  );
  const authorizationError = isAuthorizationError(response.error);

  useEffect(() => {
    if (authorizationError) void response.mutate(undefined, { revalidate: false });
  }, [authorizationError, response.mutate]);

  const data = authorizationError ? undefined : response.data;

  return {
    items: data?.items ?? [],
    nextCursor: data?.nextCursor ?? null,
    settings: data?.settings ?? { companyFeedEnabled: false },
    error: response.error,
    isLoading: enabled ? response.isLoading : false,
    mutate: response.mutate,
  };
}
