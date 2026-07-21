// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfiguracoesPage from '@/app/(platform)/configuracoes/page';

const SUPPORTER_NAME_KEY = 'privacy_community_supporter_name';

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function initialResponse(url: string, supporterNameValue?: '0' | '1'): Response {
  if (url === '/api/collaborator/archetype') return jsonResponse({ archetype: null });
  if (url === '/api/users/me/preferences') {
    return jsonResponse({
      preferences: supporterNameValue === undefined
        ? {}
        : { [SUPPORTER_NAME_KEY]: supporterNameValue },
    });
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('supporter-name privacy toggle', () => {
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
});
