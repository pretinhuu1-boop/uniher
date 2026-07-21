// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => ({
  items: [] as Array<Record<string, unknown>>,
  nextCursor: null as string | null,
  error: null as Error | null,
  isLoading: false,
  mutate: vi.fn(async () => undefined),
  options: null as null | { sessionKey: readonly unknown[] | null; enabled: boolean },
}));

const auth = vi.hoisted(() => ({
  user: {
    id: 'user-a',
    companyId: 'company-a',
    role: 'colaboradora',
    also_collaborator: 0,
  } as { id: string; companyId: string; role: string; also_collaborator: number },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: auth.user,
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useCollaborator', () => ({
  useCollaboratorSaved: (options: { sessionKey: readonly unknown[] | null; enabled: boolean }) => {
    saved.options = options;
    return saved;
  },
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
const postASecondPage = {
  ...postA,
  id: 'post-a-second-page',
  title: 'Conteúdo tardio da sessão A',
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
  saved.options = null;
  auth.user = {
    id: 'user-a',
    companyId: 'company-a',
    role: 'colaboradora',
    also_collaborator: 0,
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('profile saved community items', () => {
  it('enables saved profile only for collaborator capability and scopes the hook identity', () => {
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) =>
      Promise.resolve(baseResponse(String(input)))));
    auth.user = {
      id: 'rh-a',
      companyId: 'company-a',
      role: 'rh',
      also_collaborator: 0,
    };
    const view = render(<ConfiguracoesPage />);

    expect(screen.queryByRole('heading', { name: 'Itens salvos' })).toBeNull();
    expect(saved.options).toEqual({
      sessionKey: ['rh-a', 'company-a', 'rh', 0],
      enabled: false,
    });

    auth.user = { ...auth.user, also_collaborator: 1 };
    view.rerender(<ConfiguracoesPage />);
    expect(screen.getByRole('heading', { name: 'Itens salvos' })).toBeTruthy();
    expect(saved.options).toEqual({
      sessionKey: ['rh-a', 'company-a', 'rh', 1],
      enabled: true,
    });
  });

  it('clears session A saved items immediately when session B becomes active', async () => {
    saved.items = [postA];
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) =>
      Promise.resolve(baseResponse(String(input)))));
    const view = render(<ConfiguracoesPage />);
    expect(await screen.findByText(postA.title)).toBeTruthy();

    auth.user = {
      id: 'user-b',
      companyId: 'company-b',
      role: 'colaboradora',
      also_collaborator: 0,
    };
    saved.items = [];
    view.rerender(<ConfiguracoesPage />);

    expect(screen.queryByText(postA.title)).toBeNull();
    expect(saved.options?.sessionKey).toEqual(['user-b', 'company-b', 'colaboradora', 1]);
  });

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

  it('aborts and ignores a session A page that resolves after switching to B', async () => {
    saved.items = [postA];
    saved.nextCursor = 'cursor-a';
    let resolvePage: ((response: Response) => void) | undefined;
    const pendingPage = new Promise<Response>((resolve) => { resolvePage = resolve; });
    let pageSignal: AbortSignal | undefined;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/collaborator/saved?limit=20&cursor=')) {
        pageSignal = init?.signal ?? undefined;
        return pendingPage;
      }
      return Promise.resolve(baseResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);
    const view = render(<ConfiguracoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais itens salvos' }));

    auth.user = {
      id: 'user-b', companyId: 'company-b', role: 'colaboradora', also_collaborator: 0,
    };
    saved.items = [postB];
    saved.nextCursor = null;
    view.rerender(<ConfiguracoesPage />);
    expect(pageSignal?.aborted).toBe(true);

    resolvePage?.(jsonResponse({ items: [postASecondPage], nextCursor: null }));
    await pendingPage;
    await waitFor(() => expect(screen.getByText(postB.title)).toBeTruthy());
    expect(screen.queryByText(postASecondPage.title)).toBeNull();
    expect(screen.queryByText(postA.title)).toBeNull();
  });

  it('ignores a session A removal response after switching to B', async () => {
    saved.items = [postA];
    let resolveDelete: ((response: Response) => void) | undefined;
    const pendingDelete = new Promise<Response>((resolve) => { resolveDelete = resolve; });
    let deleteSignal: AbortSignal | undefined;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/post-a/save') && init?.method === 'DELETE') {
        deleteSignal = init.signal ?? undefined;
        return pendingDelete;
      }
      return Promise.resolve(baseResponse(url));
    });
    vi.stubGlobal('fetch', fetcher);
    const view = render(<ConfiguracoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: `Remover ${postA.title} dos salvos` }));

    auth.user = {
      id: 'user-b', companyId: 'company-b', role: 'colaboradora', also_collaborator: 0,
    };
    saved.items = [postB];
    view.rerender(<ConfiguracoesPage />);
    expect(deleteSignal?.aborted).toBe(true);

    resolveDelete?.(jsonResponse({ savedByMe: false }));
    await pendingDelete;
    await waitFor(() => expect(screen.getByText(postB.title)).toBeTruthy());
    expect(screen.queryByText(postA.title)).toBeNull();
    expect(screen.queryByText(/removido dos salvos/i)).toBeNull();
  });

  it('keeps authoritative removal successful when cache revalidation fails', async () => {
    saved.items = [postA];
    saved.mutate = vi.fn(async () => { throw new Error('revalidation failed'); });
    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/post-a/save') && init?.method === 'DELETE') {
        return Promise.resolve(jsonResponse({ savedByMe: false }));
      }
      return Promise.resolve(baseResponse(url));
    }));
    render(<ConfiguracoesPage />);

    fireEvent.click(await screen.findByRole('button', { name: `Remover ${postA.title} dos salvos` }));

    await waitFor(() => expect(screen.queryByText(postA.title)).toBeNull());
    const section = screen.getByRole('heading', { name: 'Itens salvos' }).parentElement;
    expect(section).not.toBeNull();
    expect(within(section!).getByRole('status').textContent).toContain('removido dos salvos');
    expect(within(section!).queryByRole('alert')).toBeNull();
  });
});
