// @vitest-environment jsdom

import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  user: {
    id: 'user-a',
    companyId: 'company-a',
    role: 'colaboradora',
    also_collaborator: 0,
  } as { id: string; companyId: string; role: string; also_collaborator: number },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: auth.user, isLoading: false }),
}));
vi.mock('@/hooks/useCollaborator', () => ({
  useCollaboratorSaved: () => ({
    items: [],
    nextCursor: null,
    error: null,
    isLoading: false,
    mutate: vi.fn(async () => undefined),
  }),
}));

import ConfiguracoesPage from '@/app/(platform)/configuracoes/page';

const SUPPORTER_NAME_KEY = 'privacy_community_supporter_name';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function initialResponse(url: string, supporterNameValue: '0' | '1' = '0'): Response {
  if (url === '/api/collaborator/archetype') return jsonResponse({ archetype: null });
  if (url === '/api/users/me/preferences') {
    return jsonResponse({ preferences: { [SUPPORTER_NAME_KEY]: supporterNameValue } });
  }
  if (url === '/api/push/vapid-key') return jsonResponse({ enabled: false });
  if (url === '/api/users/me/notification-preferences') return jsonResponse({ prefs: null });
  if (url === '/api/users/me') {
    return jsonResponse({
      user: {
        name: 'Ana Teste',
        nickname: 'Ana',
        email: 'ana@example.test',
        role: 'colaboradora',
      },
    });
  }
  throw new Error(`Unexpected request: ${url}`);
}

beforeEach(() => {
  auth.user = {
    id: 'user-a', companyId: 'company-a', role: 'colaboradora', also_collaborator: 0,
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('supporter-name privacy toggle', () => {
  it('keeps consent disabled after a failed load and enables it only after a valid retry', async () => {
    let preferenceReads = 0;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/users/me/preferences' && !init?.method) {
        preferenceReads += 1;
        if (preferenceReads === 1) return Promise.resolve(jsonResponse({ error: 'Falha controlada' }, 500));
        if (preferenceReads === 2) return Promise.resolve(jsonResponse({ preferences: {} }));
        return Promise.resolve(initialResponse(url, '1'));
      }
      return Promise.resolve(initialResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);

    render(<ConfiguracoesPage />);
    const toggle = await screen.findByRole('checkbox', { name: 'Mostrar meu nome ao apoiar' });
    const loadError = await screen.findByRole('alert');
    expect(loadError.textContent).toContain('Não foi possível carregar suas preferências');
    expect((toggle as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar preferências novamente' }));

    await waitFor(() => expect(preferenceReads).toBe(2));
    expect((toggle as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar preferências novamente' }));

    await waitFor(() => {
      expect((toggle as HTMLInputElement).checked).toBe(true);
      expect((toggle as HTMLInputElement).disabled).toBe(false);
    });
    expect(preferenceReads).toBe(3);
  });

  it('aborts and ignores a stale preference response after the authenticated session changes', async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    const firstResponse = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });
    let preferenceReads = 0;
    let firstSignal: AbortSignal | undefined;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/users/me/preferences' && !init?.method) {
        preferenceReads += 1;
        if (preferenceReads === 1) {
          firstSignal = init?.signal ?? undefined;
          return firstResponse;
        }
        return Promise.resolve(initialResponse(url, '0'));
      }
      return Promise.resolve(initialResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);

    const view = render(<ConfiguracoesPage />);
    const toggle = await screen.findByRole('checkbox', { name: 'Mostrar meu nome ao apoiar' });
    expect((toggle as HTMLInputElement).disabled).toBe(true);

    auth.user = {
      id: 'user-b', companyId: 'company-b', role: 'colaboradora', also_collaborator: 0,
    };
    view.rerender(<ConfiguracoesPage />);
    await waitFor(() => expect(preferenceReads).toBe(2));
    expect(firstSignal?.aborted).toBe(true);

    await act(async () => {
      resolveFirst?.(initialResponse('/api/users/me/preferences', '1'));
      await firstResponse;
    });

    await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
    expect((toggle as HTMLInputElement).checked).toBe(false);
  });

  it('starts off by default and exposes saving, disabled, and confirmation states', async () => {
    let resolvePatch: ((response: Response) => void) | undefined;
    const pendingPatch = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/users/me/preferences' && init?.method === 'PATCH') return pendingPatch;
      return Promise.resolve(initialResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);

    render(<ConfiguracoesPage />);
    const toggle = await screen.findByRole('checkbox', { name: 'Mostrar meu nome ao apoiar' });
    await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
    expect((toggle as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/desativada por padr/i)).toBeTruthy();
    expect(screen.getByText(/futuras visualiza/i)).toBeTruthy();

    fireEvent.click(toggle);
    expect((toggle as HTMLInputElement).checked).toBe(true);
    expect((toggle as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Salvando');

    await act(async () => {
      resolvePatch?.(jsonResponse({ success: true }));
      await pendingPatch;
    });

    await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));
    expect(screen.getByRole('status').textContent).toContain('Preferência salva');
    expect(fetcher).toHaveBeenCalledWith('/api/users/me/preferences', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ preferences: { [SUPPORTER_NAME_KEY]: '1' } }),
    }));
  });

  it('restores the previous state and announces an accessible error', async () => {
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/users/me/preferences' && init?.method === 'PATCH') {
        return Promise.resolve(jsonResponse({ error: 'Falha controlada' }, 500));
      }
      return Promise.resolve(initialResponse(url, '1'));
    });
    vi.stubGlobal('fetch', fetcher);

    render(<ConfiguracoesPage />);
    const toggle = await screen.findByRole('checkbox', { name: 'Mostrar meu nome ao apoiar' });
    await waitFor(() => {
      expect((toggle as HTMLInputElement).checked).toBe(true);
      expect((toggle as HTMLInputElement).disabled).toBe(false);
    });

    fireEvent.click(toggle);

    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('configuração anterior foi restaurada');
    expect((toggle as HTMLInputElement).checked).toBe(true);
    expect((toggle as HTMLInputElement).disabled).toBe(false);
  });

  it.each([
    ['success', 200, '0'],
    ['failure', 500, '1'],
  ] as const)('ignores stale PATCH %s after the authenticated session changes', async (_case, status, aValue) => {
    let resolvePatch: ((response: Response) => void) | undefined;
    const pendingPatch = new Promise<Response>((resolve) => { resolvePatch = resolve; });
    let patchSignal: AbortSignal | undefined;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/users/me/preferences' && init?.method === 'PATCH') {
        patchSignal = init.signal ?? undefined;
        return pendingPatch;
      }
      if (url === '/api/users/me/preferences') {
        return Promise.resolve(initialResponse(url, auth.user.id === 'user-a' ? aValue : '0'));
      }
      return Promise.resolve(initialResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);
    const view = render(<ConfiguracoesPage />);
    const toggle = await screen.findByRole('checkbox', { name: 'Mostrar meu nome ao apoiar' });
    await waitFor(() => expect((toggle as HTMLInputElement).disabled).toBe(false));

    fireEvent.click(toggle);
    expect((toggle as HTMLInputElement).disabled).toBe(true);
    auth.user = {
      id: 'user-b', companyId: 'company-b', role: 'colaboradora', also_collaborator: 0,
    };
    view.rerender(<ConfiguracoesPage />);

    await waitFor(() => {
      expect((toggle as HTMLInputElement).checked).toBe(false);
      expect((toggle as HTMLInputElement).disabled).toBe(false);
    });
    expect(patchSignal?.aborted).toBe(true);

    await act(async () => {
      resolvePatch?.(jsonResponse(status === 200 ? { success: true } : { error: 'stale' }, status));
      await pendingPatch;
    });

    expect((toggle as HTMLInputElement).checked).toBe(false);
    expect((toggle as HTMLInputElement).disabled).toBe(false);
    expect(screen.queryByText(/Preferência salva|configuração anterior foi restaurada/i)).toBeNull();
  });

  it('provides a 44px touch target and visible keyboard focus by CSS contract', () => {
    const css = fs.readFileSync(path.join(
      process.cwd(),
      'src/app/(platform)/configuracoes/config.module.css',
    ), 'utf8');

    expect(css).toMatch(/\.toggle\s*\{[\s\S]*?min-height:\s*44px[^}]*\}/);
    expect(css).toMatch(/\.toggle\s*\{[\s\S]*?min-width:\s*44px[^}]*\}/);
    expect(css).toMatch(/\.toggleInput:focus-visible\s*\+\s*\.toggleSlider\s*\{[\s\S]*?outline:/);
  });
});
