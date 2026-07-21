// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MasterCompanySelector } from '@/components/community/management/MasterCompanySelector';

describe('MasterCompanySelector lifecycle', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('aborts the active company pagination request on unmount', async () => {
    const request = { signal: null as AbortSignal | null };
    const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
      request.signal = init?.signal as AbortSignal;
      return new Promise<Response>(() => {});
    });
    vi.stubGlobal('fetch', fetcher);

    const { unmount } = render(
      <MasterCompanySelector selectedCompanyId="" disabled={false} onChange={vi.fn()} />,
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    expect(request.signal?.aborted).toBe(false);

    unmount();

    expect(request.signal?.aborted).toBe(true);
  });
});
