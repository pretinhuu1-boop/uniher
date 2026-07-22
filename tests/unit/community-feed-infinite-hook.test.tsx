// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  infiniteMutate: vi.fn(),
  globalMutate: vi.fn(),
  setSize: vi.fn(),
  error: undefined as (Error & { status?: number }) | undefined,
  data: [{
    items: [{
      id: 'stale-post',
      title: 'Conteúdo de outro escopo',
      summary: 'Resumo que deve ser ocultado.',
      bodyText: 'Corpo que deve ser ocultado.',
      topic: 'geral' as const,
      readTimeMinutes: 3,
      imagePath: null,
      publishedAt: '2026-07-20T12:00:00.000Z',
      supportCount: 0,
      supportedByMe: false,
      savedByMe: false,
    }],
    nextCursor: null,
    scope: 'company' as const,
    settings: { companyFeedEnabled: true },
  }],
}));

vi.mock('swr/infinite', () => ({
  default: () => ({
    data: mocks.data,
    error: mocks.error,
    isLoading: false,
    isValidating: false,
    mutate: mocks.infiniteMutate,
    setSize: mocks.setSize,
    size: 1,
  }),
}));
vi.mock('swr', () => ({
  default: vi.fn(),
  useSWRConfig: () => ({ mutate: mocks.globalMutate }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-b', companyId: 'company-b', role: 'colaboradora', also_collaborator: 0 },
  }),
}));

import {
  buildCollaboratorSavedKey,
  useCollaboratorCommunityFeed,
} from '@/hooks/useCollaborator';

describe('paginated collaborator feed auth boundary', () => {
  beforeEach(() => {
    mocks.error = undefined;
    mocks.infiniteMutate.mockReset().mockResolvedValue(undefined);
    mocks.globalMutate.mockReset().mockResolvedValue(undefined);
    mocks.setSize.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([401, 403])('masks and purges cached pages after a %s response', async (status) => {
    mocks.error = Object.assign(new Error('authorization boundary'), { status });

    const { result } = renderHook(() => useCollaboratorCommunityFeed());

    expect(result.current.items).toEqual([]);
    expect(result.current.settings).toEqual({ companyFeedEnabled: false });
    await waitFor(() => expect(mocks.infiniteMutate).toHaveBeenCalledWith(undefined, { revalidate: false }));
  });

  it('invalidates only the current session saved tuple after a feed save', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ savedByMe: true }),
      { status: 200 },
    )));
    const { result } = renderHook(() => useCollaboratorCommunityFeed());

    await act(async () => {
      await result.current.save('post-a');
    });

    expect(mocks.globalMutate).toHaveBeenCalledTimes(2);
    const predicate = mocks.globalMutate.mock.calls[0][0] as (key: unknown) => boolean;
    expect(predicate(buildCollaboratorSavedKey(['user-b', 'company-b', 'rh', 0]))).toBe(true);
    expect(predicate(buildCollaboratorSavedKey(['user-b', 'company-b', 'admin', 1]))).toBe(true);
    expect(predicate(buildCollaboratorSavedKey(['user-a', 'company-b', 'colaboradora', 1]))).toBe(false);
    expect(predicate(buildCollaboratorSavedKey(['user-b', 'company-a', 'colaboradora', 1]))).toBe(false);
    expect(mocks.globalMutate.mock.calls[0].slice(1)).toEqual([
      undefined,
      { revalidate: false },
    ]);
    expect(mocks.globalMutate.mock.calls[1]).toEqual([
      buildCollaboratorSavedKey(['user-b', 'company-b', 'colaboradora', 1]),
    ]);
  });
});
