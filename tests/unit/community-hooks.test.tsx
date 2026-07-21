// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommunityFeedResponse } from '@/types/community';

const mocks = vi.hoisted(() => ({
  feedMutate: vi.fn(),
  savedMutate: vi.fn(),
  globalMutate: vi.fn(),
  feedState: { data: undefined as unknown, error: undefined as unknown, isLoading: false },
  savedState: { data: undefined as unknown, error: undefined as unknown, isLoading: false },
  swrKeys: [] as unknown[],
  user: {
    id: 'user-a',
    companyId: 'company-a',
    role: 'colaboradora',
    also_collaborator: 0,
  },
}));

vi.mock('swr', () => ({
  default: (key: unknown) => {
    mocks.swrKeys.push(key);
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.includes('/saved')
      ? { ...mocks.savedState, mutate: mocks.savedMutate }
      : { ...mocks.feedState, mutate: mocks.feedMutate };
  },
  useSWRConfig: () => ({ mutate: mocks.globalMutate }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

import {
  COLLABORATOR_FEED_KEY,
  COLLABORATOR_SAVED_KEY,
  buildCollaboratorSavedKey,
  useCollaboratorFeed,
  useCollaboratorSaved,
} from '@/hooks/useCollaborator';

const sessionA = ['user-a', 'company-a', 'colaboradora', 1] as const;
const sessionB = ['user-b', 'company-b', 'colaboradora', 1] as const;

const feedData: CommunityFeedResponse = {
  items: [{
    id: 'post-a',
    title: 'Post A',
    summary: 'Resumo seguro',
    bodyText: 'Conteudo seguro da comunidade',
    topic: 'geral',
    readTimeMinutes: 4,
    imagePath: null,
    publishedAt: '2026-07-20T12:00:00.000Z',
    supportCount: 1,
    supportedByMe: true,
    savedByMe: true,
  }],
  nextCursor: 'cursor-a',
  scope: 'company',
  settings: { companyFeedEnabled: true },
};

function authError(status: 401 | 403): Error & { status: number } {
  return Object.assign(new Error('auth boundary'), { status });
}

describe('collaborator community SWR lifecycle', () => {
  beforeEach(() => {
    mocks.feedState.data = feedData;
    mocks.feedState.error = undefined;
    mocks.savedState.data = feedData;
    mocks.savedState.error = undefined;
    mocks.feedMutate.mockReset().mockResolvedValue(undefined);
    mocks.savedMutate.mockReset().mockResolvedValue(undefined);
    mocks.globalMutate.mockReset().mockResolvedValue(undefined);
    mocks.swrKeys = [];
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([
    ['feed', 401, useCollaboratorFeed, mocks.feedState, mocks.feedMutate],
    ['saved', 403, () => useCollaboratorSaved({ sessionKey: sessionA, enabled: true }), mocks.savedState, mocks.savedMutate],
  ] as const)('masks and purges stale %s data after a %s error', async (_name, status, hook, state, mutate) => {
    const error = authError(status);
    state.error = error;

    const { result } = renderHook(() => hook());

    expect(result.current.items).toEqual([]);
    expect(result.current.nextCursor).toBeNull();
    expect(result.current.settings).toEqual({ companyFeedEnabled: false });
    expect(result.current.error).toBe(error);
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(undefined, { revalidate: false }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('uses a capability-scoped tuple key and disables saved fetching without capability', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useCollaboratorSaved({ sessionKey: sessionA, enabled }),
      { initialProps: { enabled: true } },
    );

    expect(mocks.swrKeys.at(-1)).toEqual([
      COLLABORATOR_SAVED_KEY,
      'user-a',
      'company-a',
      'colaboradora',
      1,
    ]);

    rerender({ enabled: false });
    expect(mocks.swrKeys.at(-1)).toBeNull();
  });

  it('never exposes saved data from session A after switching to session B', () => {
    mocks.savedState.data = feedData;
    const { result, rerender } = renderHook(
      ({ sessionKey }) => useCollaboratorSaved({ sessionKey, enabled: true }),
      { initialProps: { sessionKey: sessionA as typeof sessionA | typeof sessionB } },
    );
    expect(result.current.items[0]?.id).toBe('post-a');

    mocks.savedState.data = undefined;
    rerender({ sessionKey: sessionB });

    expect(result.current.items).toEqual([]);
    expect(mocks.swrKeys.at(-1)).toEqual(buildCollaboratorSavedKey(sessionB));
  });

  it('encodes mutation IDs and invalidates both feed and saved after save changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValue(new Response(JSON.stringify({ savedByMe: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useCollaboratorFeed());

    await act(async () => {
      await result.current.save('post/id ?');
      await result.current.unsave('post/id ?');
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/collaborator/feed/post%2Fid%20%3F/save',
      { method: 'POST' },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/collaborator/feed/post%2Fid%20%3F/save',
      { method: 'DELETE' },
    );
    expect(mocks.globalMutate).toHaveBeenCalledTimes(4);
    expect(mocks.globalMutate.mock.calls[0]).toEqual([COLLABORATOR_FEED_KEY]);
    expect(mocks.globalMutate.mock.calls[2]).toEqual([COLLABORATOR_FEED_KEY]);
    for (const callIndex of [1, 3]) {
      const predicate = mocks.globalMutate.mock.calls[callIndex][0] as (key: unknown) => boolean;
      expect(predicate(buildCollaboratorSavedKey(['user-a', 'company-a', 'rh', 0]))).toBe(true);
      expect(predicate(buildCollaboratorSavedKey(['user-a', 'company-a', 'admin', 1]))).toBe(true);
      expect(predicate(buildCollaboratorSavedKey(['user-b', 'company-a', 'colaboradora', 1]))).toBe(false);
      expect(predicate(buildCollaboratorSavedKey(['user-a', 'company-b', 'colaboradora', 1]))).toBe(false);
    }
  });

  it('encodes support IDs and revalidates the feed key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ supportCount: 1, supportedByMe: true }),
      { status: 200 },
    )));
    const { result } = renderHook(() => useCollaboratorFeed());

    await act(async () => {
      await result.current.support('post/id ?');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/collaborator/feed/post%2Fid%20%3F/support',
      { method: 'POST' },
    );
    expect(mocks.globalMutate).toHaveBeenCalledWith(COLLABORATOR_FEED_KEY);
  });
});
