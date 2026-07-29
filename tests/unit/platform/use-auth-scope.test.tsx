// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  push: vi.fn(),
  router: { push: vi.fn() },
  mutate: vi.fn<() => Promise<void>>(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));
vi.mock('swr', () => ({ mutate: mocks.mutate }));

import { authBoundaryNavigation, useAuthState } from '@/hooks/useAuth';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolver => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function authResponse(id: string, companyId: string) {
  return new Response(JSON.stringify({
    user: {
      id,
      name: id,
      email: `${id}@example.test`,
      role: 'rh',
      companyId,
      created_at: '2026-07-16',
      approved: 1,
    },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('useAuthState privacy scope revalidation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    mocks.pathname = '/dashboard';
    mocks.router.push.mockReset();
    mocks.mutate.mockReset();
    mocks.mutate.mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('skips the session check on public auth without a stored user or redirect', async () => {
    mocks.pathname = '/auth';
    window.history.pushState({}, '', '/auth');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('checks the cookie session on auth when a safe redirect is present', async () => {
    mocks.pathname = '/auth';
    window.history.pushState({}, '', '/auth?redirect=%2Fadmin');
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
  });

  it('discards an older auth response after pathname revalidation starts', async () => {
    const older = deferred<Response>();
    const newer = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result, rerender } = renderHook(() => useAuthState());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const olderSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(olderSignal).toBeInstanceOf(AbortSignal);

    mocks.pathname = '/historico';
    rerender();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(olderSignal?.aborted).toBe(true);

    newer.resolve(authResponse('user-b', 'company-b'));
    await waitFor(() => expect(result.current.user?.id).toBe('user-b'));

    await act(async () => {
      older.resolve(authResponse('user-a', 'company-a'));
      await older.promise;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.user?.id).toBe('user-b');
  });

  it('does not let an older refreshUser response overwrite a newer scope', async () => {
    const older = deferred<Response>();
    const newer = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const olderRefresh = result.current.refreshUser();
    const newerRefresh = result.current.refreshUser();

    await act(async () => {
      newer.resolve(authResponse('user-b', 'company-b'));
      await expect(newerRefresh).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });
    expect(result.current.user?.id).toBe('user-b');

    await act(async () => {
      older.resolve(authResponse('user-a', 'company-a'));
      await expect(olderRefresh).resolves.toBeNull();
    });
    expect(result.current.user?.id).toBe('user-b');
  });

  it('lets refreshUser supersede an in-flight mount check without leaving auth loading', async () => {
    const mountCheck = deferred<Response>();
    const refresh = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockReturnValueOnce(mountCheck.promise)
      .mockReturnValueOnce(refresh.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    expect(result.current.isLoading).toBe(true);

    const refreshResult = result.current.refreshUser();
    await act(async () => {
      refresh.resolve(authResponse('user-b', 'company-b'));
      await expect(refreshResult).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });

    expect(result.current.user?.id).toBe('user-b');
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      mountCheck.resolve(authResponse('user-a', 'company-a'));
      await mountCheck.promise;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.user?.id).toBe('user-b');
  });

  it('invalidates a refresh started while logout is in flight before applying logout', async () => {
    const logoutResponse = deferred<Response>();
    const refreshResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockReturnValueOnce(logoutResponse.promise)
      .mockReturnValueOnce(refreshResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));

    const logoutResult = result.current.logout();
    const refreshResult = result.current.refreshUser();

    await act(async () => {
      logoutResponse.resolve(new Response('{}', { status: 200 }));
      await logoutResult;
    });
    expect(result.current.user).toBeNull();

    await act(async () => {
      refreshResponse.resolve(authResponse('user-a', 'company-a'));
      await expect(refreshResult).resolves.toBeNull();
    });
    expect(result.current.user).toBeNull();
  });

  it('serializes login HTTP side effects in invocation order', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const firstLogin = result.current.login('user-a@example.test', 'password-a');
    const secondLogin = result.current.login('user-b@example.test', 'password-b');
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstResponse.resolve(authResponse('user-a', 'company-a'));
      await expect(firstLogin).resolves.toMatchObject({ id: 'user-a', companyId: 'company-a' });
    });
    expect(result.current.user?.id).toBe('user-a');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await act(async () => {
      secondResponse.resolve(authResponse('user-b', 'company-b'));
      await expect(secondLogin).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });
    expect(result.current.user?.id).toBe('user-b');
  });

  it('serializes register HTTP side effects in invocation order', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const firstRegister = result.current.register({ email: 'user-a@example.test' });
    const secondRegister = result.current.register({ email: 'user-b@example.test' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      firstResponse.resolve(authResponse('user-a', 'company-a'));
      await expect(firstRegister).resolves.toBe(true);
    });
    expect(result.current.user?.id).toBe('user-a');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    await act(async () => {
      secondResponse.resolve(authResponse('user-b', 'company-b'));
      await expect(secondRegister).resolves.toBe(true);
    });
    expect(result.current.user?.id).toBe('user-b');
  });

  it('serializes login before a later logout so logout owns the final session', async () => {
    const loginResponse = deferred<Response>();
    const logoutResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(loginResponse.promise)
      .mockReturnValueOnce(logoutResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const loginResult = result.current.login('user-b@example.test', 'password');
    const logoutResult = result.current.logout();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      loginResponse.resolve(authResponse('user-b', 'company-b'));
      await expect(loginResult).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/auth/logout');

    await act(async () => {
      logoutResponse.resolve(new Response('{}', { status: 200 }));
      await logoutResult;
    });
    expect(result.current.user).toBeNull();
  });

  it('does not let a local role selection cancel an in-flight session mutation', async () => {
    const loginResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockReturnValueOnce(loginResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));

    const loginResult = result.current.login('user-b@example.test', 'password');
    await act(async () => {
      await result.current.selectRole('colaboradora');
    });
    expect(result.current.user).toMatchObject({ id: 'user-a', role: 'colaboradora' });

    await act(async () => {
      loginResponse.resolve(authResponse('user-b', 'company-b'));
      await expect(loginResult).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });
    expect(result.current.user).toMatchObject({ id: 'user-b', role: 'rh' });
  });

  it('serializes same-scope logins behind the first pending cache purge', async () => {
    const purge = deferred<void>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockResolvedValueOnce(authResponse('user-b', 'company-b'))
      .mockResolvedValueOnce(authResponse('user-b', 'company-b'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));
    mocks.mutate.mockReset();
    mocks.mutate.mockReturnValue(purge.promise);

    const firstLogin = result.current.login('user-b@example.test', 'password-1');
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(1));

    let secondSettled = false;
    const secondLogin = result.current.login('user-b@example.test', 'password-2')
      .finally(() => {
        secondSettled = true;
      });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const userBeforePurge = result.current.user?.id;
    const settledBeforePurge = secondSettled;

    await act(async () => {
      purge.resolve();
      await expect(secondLogin).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
      await expect(firstLogin).resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });

    expect(settledBeforePurge).toBe(false);
    expect(userBeforePurge).toBe('user-a');
    expect(result.current.user?.id).toBe('user-b');
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it('keeps the first successful login coherent when the queued login is rejected', async () => {
    const firstResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const firstLogin = result.current.login('user-a@example.test', 'password-a');
    const secondLogin = result.current.login('user-b@example.test', 'wrong-password');

    await act(async () => {
      firstResponse.resolve(authResponse('user-a', 'company-a'));
      await expect(firstLogin).resolves.toMatchObject({ id: 'user-a', companyId: 'company-a' });
    });
    await act(async () => {
      await expect(secondLogin).resolves.toBeNull();
    });

    expect(result.current.user?.id).toBe('user-a');
    expect(localStorage.getItem('uniher-user')).toContain('user-a');
  });

  it('keeps the first successful registration coherent when the queued registration is rejected', async () => {
    const firstResponse = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('initial-user', 'initial-company'))
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValueOnce(new Response('{}', { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('initial-user'));

    const firstRegister = result.current.register({ email: 'user-a@example.test' });
    const secondRegister = result.current.register({ email: 'user-b@example.test' });

    await act(async () => {
      firstResponse.resolve(authResponse('user-a', 'company-a'));
      await expect(firstRegister).resolves.toBe(true);
    });
    await act(async () => {
      await expect(secondRegister).resolves.toBe(false);
    });

    expect(result.current.user?.id).toBe('user-a');
    expect(localStorage.getItem('uniher-user')).toContain('user-a');
  });

  it('does not mark a new scope when purge fails and recovers the transition queue', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockResolvedValueOnce(authResponse('user-b', 'company-b'))
      .mockResolvedValueOnce(authResponse('user-b', 'company-b'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));
    mocks.mutate.mockReset();
    mocks.mutate
      .mockRejectedValueOnce(new Error('purge failed'))
      .mockResolvedValueOnce();
    const reload = vi.spyOn(authBoundaryNavigation, 'reload').mockImplementation(() => {});

    await act(async () => {
      await expect(result.current.login('user-b@example.test', 'password-1')).resolves.toBeNull();
    });
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('uniher-user')).toBeNull();
    expect(sessionStorage.getItem('uniher-session-active')).toBeNull();
    expect(reload).toHaveBeenCalledOnce();

    await act(async () => {
      await expect(result.current.login('user-b@example.test', 'password-2'))
        .resolves.toMatchObject({ id: 'user-b', companyId: 'company-b' });
    });
    expect(result.current.user?.id).toBe('user-b');
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });

  it('fails closed when logout cannot purge the authenticated scope', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));
    mocks.mutate.mockReset();
    mocks.mutate.mockRejectedValueOnce(new Error('purge failed'));
    const reload = vi.spyOn(authBoundaryNavigation, 'reload').mockImplementation(() => {});

    await act(async () => {
      await expect(result.current.logout()).resolves.toBeUndefined();
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('uniher-user')).toBeNull();
    expect(sessionStorage.getItem('uniher-session-active')).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('finishes auth loading when the latest login is rejected', async () => {
    const mountCheck = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockReturnValueOnce(mountCheck.promise)
      .mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await act(async () => {
      await expect(result.current.login('user-a@example.test', 'wrong')).resolves.toBeNull();
    });
    const loadingAfterFailure = result.current.isLoading;

    await act(async () => {
      mountCheck.resolve(authResponse('user-a', 'company-a'));
      await mountCheck.promise;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(loadingAfterFailure).toBe(false);
  });

  it('finishes auth loading when the latest registration is rejected', async () => {
    const mountCheck = deferred<Response>();
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockReturnValueOnce(mountCheck.promise)
      .mockResolvedValueOnce(new Response('{}', { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await act(async () => {
      await expect(result.current.register({ email: 'duplicate@example.test' })).resolves.toBe(false);
    });
    const loadingAfterFailure = result.current.isLoading;

    await act(async () => {
      mountCheck.resolve(authResponse('user-a', 'company-a'));
      await mountCheck.promise;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(loadingAfterFailure).toBe(false);
  });

  it('fails closed instead of restoring stored A when mount receives B but purge fails', async () => {
    localStorage.setItem('uniher-user', JSON.stringify({
      id: 'stored-user-a',
      name: 'Stored A',
      role: 'rh',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(authResponse('user-b', 'company-b')));
    mocks.mutate.mockRejectedValueOnce(new Error('purge failed'));
    const reload = vi.spyOn(authBoundaryNavigation, 'reload').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(result.current.user).toBeNull();
    expect(result.current.approved).toBe(true);
    expect(localStorage.getItem('uniher-user')).toBeNull();
    expect(sessionStorage.getItem('uniher-session-active')).toBeNull();
  });

  it('fails closed when a non-OK mount response cannot purge the previous boundary', async () => {
    localStorage.setItem('uniher-user', JSON.stringify({
      id: 'stored-user-a',
      name: 'Stored A',
      role: 'rh',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    mocks.mutate.mockRejectedValueOnce(new Error('purge failed'));
    const reload = vi.spyOn(authBoundaryNavigation, 'reload').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('uniher-user')).toBeNull();
  });

  it('fails closed when refreshUser receives B but its scope purge fails', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(authResponse('user-a', 'company-a'))
      .mockResolvedValueOnce(authResponse('user-b', 'company-b'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.user?.id).toBe('user-a'));
    mocks.mutate.mockReset();
    mocks.mutate.mockRejectedValueOnce(new Error('purge failed'));
    const reload = vi.spyOn(authBoundaryNavigation, 'reload').mockImplementation(() => {});

    await act(async () => {
      await expect(result.current.refreshUser()).resolves.toBeNull();
    });

    expect(reload).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
    expect(result.current.approved).toBe(true);
    expect(localStorage.getItem('uniher-user')).toBeNull();
    expect(sessionStorage.getItem('uniher-session-active')).toBeNull();
  });
});
