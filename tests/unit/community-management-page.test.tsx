// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockUser } from '@/types/platform';

const mocks = vi.hoisted(() => ({
  user: {
    id: 'master-admin',
    name: 'Master Admin',
    email: 'master@example.test',
    role: 'admin',
    companyId: undefined,
    isMasterAdmin: true,
    joinedAt: '',
  } as MockUser,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false }),
}));

import CommunityManagementPage from '@/app/(platform)/comunidade/gerenciar/page';

const companyA = { id: 'company-a', name: 'Empresa A', trade_name: null, is_active: 1 };
const postA = {
  id: 'post-a',
  title: 'Conteúdo da empresa A',
  summary: 'Resumo válido da empresa A.',
  bodyText: 'Corpo válido do conteúdo da empresa A.',
  topic: 'geral' as const,
  readTimeMinutes: 3,
  imagePath: null,
  status: 'draft' as const,
};
const postB = {
  ...postA,
  id: 'post-b',
  title: 'Conteúdo da empresa B',
  summary: 'Resumo válido da empresa B.',
  bodyText: 'Corpo válido do conteúdo da empresa B.',
};

function jsonResponse(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CommunityManagementPage workspace mutations', () => {
  beforeEach(() => {
    mocks.user = {
      id: 'master-admin',
      name: 'Master Admin',
      email: 'master@example.test',
      role: 'admin',
      companyId: undefined,
      isMasterAdmin: true,
      joinedAt: '',
    };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ignores a publish response after the authenticated company workspace changes', async () => {
    let resolvePublish: ((response: Response) => void) | undefined;
    const pendingPublish = new Promise<Response>((resolve) => {
      resolvePublish = resolve;
    });
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/admin/companies')) {
        return Promise.resolve(jsonResponse({ companies: [companyA], total: 1, limit: 200, offset: 0 }));
      }
      if (init?.method === 'PATCH') return pendingPublish;
      if (url === '/api/rh/community/posts?companyId=company-a') {
        return Promise.resolve(jsonResponse({ items: [postA], settings: { companyFeedEnabled: true } }));
      }
      if (url === '/api/rh/community/posts') {
        return Promise.resolve(jsonResponse({ items: [postB], settings: { companyFeedEnabled: true } }));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal('fetch', fetcher);

    const view = render(<CommunityManagementPage />);
    const companySelector = await screen.findByLabelText('Empresa selecionada');
    fireEvent.change(companySelector, { target: { value: companyA.id } });
    const postAButton = await screen.findByRole('button', { name: /Conteúdo da empresa A/ });
    fireEvent.click(postAButton);
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => {
      expect((companySelector as HTMLSelectElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Novo conteúdo' }) as HTMLButtonElement).disabled).toBe(true);
      expect((postAButton as HTMLButtonElement).disabled).toBe(true);
    });

    mocks.user = {
      id: 'rh-company-b',
      name: 'RH Empresa B',
      email: 'rh-b@example.test',
      role: 'rh',
      companyId: 'company-b',
      isMasterAdmin: false,
      joinedAt: '',
    };
    view.rerender(<CommunityManagementPage />);
    await screen.findByRole('button', { name: /Conteúdo da empresa B/ });

    await act(async () => {
      resolvePublish?.(jsonResponse({ post: { ...postA, status: 'published' } }));
      await pendingPublish;
    });

    expect(screen.queryByText('Conteúdo publicado no feed da empresa.')).toBeNull();
    expect((screen.getByRole('button', { name: /Conteúdo da empresa B/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
