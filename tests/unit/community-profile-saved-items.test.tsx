// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  nextCursor: null as string | null,
  error: null as Error | null,
  isLoading: false,
  mutate: vi.fn(async () => undefined),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-a', companyId: 'company-a', role: 'colaboradora' },
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useCollaborator', () => ({
  useCollaboratorSaved: () => saved,
}));

import ConfiguracoesPage from '@/app/(platform)/configuracoes/page';

const postA = {
  id: 'post-a',
  title: 'Pausa para respirar',
  summary: 'Uma pausa curta para recuperar energia.',
  bodyText: 'Conteúdo completo.',
  topic: 'pausas',
  readTimeMinutes: 3,
  imagePath: null,
  publishedAt: '2026-07-21T10:00:00.000Z',
  expiresAt: null,
  supportCount: 2,
  supportedByMe: false,
  savedByMe: true,
};
const postB = {
  ...postA,
  id: 'post-b',
  title: 'Sono com mais regularidade',
  topic: 'sono',
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function baseResponse(url: string): Response {
  if (url === '/api/collaborator/archetype') return jsonResponse({ archetype: null });
  if (url === '/api/users/me/preferences') {
    return jsonResponse({ preferences: { privacy_community_supporter_name: '0' } });
  }
  if (url === '/api/push/vapid-key') return jsonResponse({ enabled: false });
  if (url === '/api/users/me/notification-preferences') return jsonResponse({ prefs: null });
  if (url === '/api/users/me') {
    return jsonResponse({
      user: { name: 'Ana', nickname: 'Ana', email: 'ana@example.test', role: 'colaboradora' },
    });
  }
  throw new Error(`Unexpected request: ${url}`);
}

beforeEach(() => {
  saved.items = [];
  saved.nextCursor = null;
  saved.error = null;
  saved.isLoading = false;
  saved.mutate = vi.fn(async () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('profile saved community items', () => {
  it('renders loading, error/retry, empty states and the privacy boundary declaration', async () => {
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) =>
      Promise.resolve(baseResponse(String(input)))));
    saved.isLoading = true;
    const view = render(<ConfiguracoesPage />);

    const savedSection = screen.getByRole('heading', { name: 'Itens salvos' }).parentElement;
    expect(savedSection).not.toBeNull();
    expect(within(savedSection!).getByRole('status').textContent).toContain('Carregando itens salvos');
    expect(screen.getByText(
      'Check-ins, semáforo e respostas da NR-1 nunca entram na comunidade.',
    )).toBeTruthy();

    saved.isLoading = false;
    saved.error = new Error('Falha controlada');
    view.rerender(<ConfiguracoesPage />);
    expect(within(savedSection!).getByRole('alert')).toBeTruthy();
    fireEvent.click(within(savedSection!).getByRole('button', { name: 'Tentar carregar itens salvos novamente' }));
    expect(saved.mutate).toHaveBeenCalledTimes(1);

    saved.error = null;
    view.rerender(<ConfiguracoesPage />);
    expect(await screen.findByText('Você ainda não salvou conteúdos da comunidade.')).toBeTruthy();
  });

  it('renders a compact saved list and removes an item through the existing private route', async () => {
    saved.items = [postA];
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/collaborator/feed/post-a/save' && init?.method === 'DELETE') {
        expect(init.body).toBeUndefined();
        return Promise.resolve(jsonResponse({ savedByMe: false }));
      }
      return Promise.resolve(baseResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);

    render(<ConfiguracoesPage />);
    expect(await screen.findByText(postA.title)).toBeTruthy();
    expect(screen.getByText('Pausas · 3 min')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: `Remover ${postA.title} dos salvos` }));

    await waitFor(() => expect(screen.queryByText(postA.title)).toBeNull());
    expect(saved.mutate).toHaveBeenCalledTimes(1);
    const savedSection = screen.getByRole('heading', { name: 'Itens salvos' }).parentElement;
    expect(savedSection).not.toBeNull();
    expect(within(savedSection!).getByRole('status').textContent).toContain('removido dos salvos');
  });

  it('loads the next saved page from the cursor returned by the hook contract', async () => {
    saved.items = [postA];
    saved.nextCursor = 'cursor page 2';
    const fetcher = vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url === '/api/collaborator/saved?limit=20&cursor=cursor%20page%202') {
        return Promise.resolve(jsonResponse({ items: [postB], nextCursor: null }));
      }
      return Promise.resolve(baseResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);

    render(<ConfiguracoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais itens salvos' }));

    expect(await screen.findByText(postB.title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Carregar mais itens salvos' })).toBeNull();
  });
});
