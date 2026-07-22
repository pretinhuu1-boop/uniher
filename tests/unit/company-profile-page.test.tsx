// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CompanyProfilePage from '@/app/(platform)/company-profile/page';
import { AuthContext } from '@/hooks/useAuth';
import type { MockUser } from '@/types/platform';

const company = {
  id: 'company-a',
  name: 'Empresa Original',
  trade_name: 'Original',
  cnpj: '12.345.678/0001-90',
  sector: 'Tecnologia',
  plan: 'premium',
  logo_url: null,
  contact_name: 'Ana',
  contact_email: 'ana@example.test',
  contact_phone: '11999999999',
  created_at: '2025-01-01T00:00:00.000Z',
  user_count: 10,
  department_count: 2,
  missions_active: 3,
  feed_company_enabled: false,
};

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferredResponse() {
  let resolve: ((response: Response) => void) | undefined;
  const promise = new Promise<Response>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve: (response: Response) => resolve?.(response) };
}

const rhUser: MockUser = {
  id: 'user-rh',
  name: 'RH Teste',
  email: 'rh@example.test',
  role: 'rh',
  companyId: 'company-a',
  joinedAt: '2025-01-01T00:00:00.000Z',
};

function renderWithAuth(user: MockUser | null = rhUser) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
        approved: true,
        login: vi.fn(),
        register: vi.fn(),
        selectRole: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      }}
    >
      <CompanyProfilePage />
    </AuthContext.Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('company profile editing', () => {
  it('locks a save synchronously and disables every editing control until it settles', async () => {
    const firstPatch = deferredResponse();
    const stalePatch = deferredResponse();
    let patchCount = 0;
    const fetcher = vi.fn((input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === '/api/company' && init?.method === 'PATCH') {
        patchCount += 1;
        return patchCount === 1 ? firstPatch.promise : stalePatch.promise;
      }
      return Promise.resolve(jsonResponse({ company }));
    });
    vi.stubGlobal('fetch', fetcher);

    renderWithAuth();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Dados' }));

    const save = screen.getByRole('button', { name: 'Salvar' });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(patchCount).toBe(1);
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: 'Feed da comunidade da empresa' }) as HTMLButtonElement).disabled).toBe(true);
    for (const field of screen.getAllByRole('textbox')) {
      expect((field as HTMLInputElement).disabled).toBe(true);
    }

    await act(async () => {
      stalePatch.resolve(jsonResponse({ company: { ...company, name: 'Resposta antiga' } }));
      firstPatch.resolve(jsonResponse({ company: { ...company, name: 'Empresa Original' } }));
      await firstPatch.promise;
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar Dados' })).toBeTruthy());
    expect(screen.queryByText('Resposta antiga')).toBeNull();
    expect(patchCount).toBe(1);
  });

  it('exposes switch semantics, state, visible focus, and a 44px touch target', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ company })));

    renderWithAuth();
    const switchControl = await screen.findByRole('switch', { name: 'Feed da comunidade da empresa' });

    expect(switchControl.getAttribute('aria-checked')).toBe('false');
    expect(switchControl.className).toContain('min-h-11');
    expect(switchControl.className).toContain('min-w-11');
    expect(switchControl.className).toContain('focus-visible:ring-2');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Dados' }));
    fireEvent.click(switchControl);

    expect(switchControl.getAttribute('aria-checked')).toBe('true');
  });

  it('does not fetch company data for a master admin without a company', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    renderWithAuth({
      id: 'user-admin',
      name: 'Admin UniHER',
      email: 'admin@uniher.com.br',
      role: 'admin',
      companyId: undefined,
      isMasterAdmin: true,
      joinedAt: '2025-01-01T00:00:00.000Z',
    });

    expect(await screen.findByRole('heading', { name: 'Perfil por empresa' })).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalledWith('/api/company');
  });
});
