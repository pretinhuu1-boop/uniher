// @vitest-environment jsdom

import type { PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { SWRConfig, unstable_serialize } from 'swr';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommunityFeedResponse } from '@/types/community';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-a',
      companyId: 'company-a',
      role: 'colaboradora',
      also_collaborator: 0,
    },
  }),
}));

import {
  buildCollaboratorSavedKey,
  useCollaboratorFeed,
} from '@/hooks/useCollaborator';

const page: CommunityFeedResponse = {
  items: [],
  nextCursor: null,
  scope: 'company',
  settings: { companyFeedEnabled: true },
};

function cacheState(key: readonly unknown[], marker: string) {
  return {
    data: { ...page, marker },
    _k: key,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('saved community cache purge', () => {
  it('purges every role variant for the current user/company and preserves other identities', async () => {
    const current = buildCollaboratorSavedKey(['user-a', 'company-a', 'colaboradora', 1]);
    const priorRole = buildCollaboratorSavedKey(['user-a', 'company-a', 'rh', 0]);
    const otherUser = buildCollaboratorSavedKey(['user-b', 'company-a', 'colaboradora', 1]);
    const otherCompany = buildCollaboratorSavedKey(['user-a', 'company-b', 'colaboradora', 1]);
    const cache = new Map<string, Record<string, unknown>>([
      [unstable_serialize(current), cacheState(current, 'current')],
      [unstable_serialize(priorRole), cacheState(priorRole, 'prior-role')],
      [unstable_serialize(otherUser), cacheState(otherUser, 'other-user')],
      [unstable_serialize(otherCompany), cacheState(otherCompany, 'other-company')],
    ]);
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/save') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ savedByMe: true }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify(page), { status: 200 }));
    }));
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache, dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    );
    const { result } = renderHook(() => useCollaboratorFeed(), { wrapper });

    await act(async () => {
      await result.current.save('post-a');
    });

    expect(cache.get(unstable_serialize(current))?.data).toBeUndefined();
    expect(cache.get(unstable_serialize(priorRole))?.data).toBeUndefined();
    expect(cache.get(unstable_serialize(otherUser))?.data).toMatchObject({ marker: 'other-user' });
    expect(cache.get(unstable_serialize(otherCompany))?.data).toMatchObject({ marker: 'other-company' });
  });
});
