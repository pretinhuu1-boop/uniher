import { describe, expect, it, vi } from 'vitest';

import {
  createEditorialWorkspaceGuard,
  loadAllEditorialCompanies,
  type EditorialCompany,
} from '@/components/community/management/types';

function company(index: number): EditorialCompany {
  return {
    id: `company-${index}`,
    name: `Empresa ${index}`,
    trade_name: null,
    is_active: 1,
  };
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('editorial company pagination', () => {
  it('loads every page and deduplicates company ids', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => company(index));
    const secondPage = [company(199), ...Array.from({ length: 5 }, (_, index) => company(200 + index))];
    const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ companies: firstPage, total: 206, limit: 200, offset: 0 }))
      .mockResolvedValueOnce(jsonResponse({ companies: secondPage, total: 206, limit: 200, offset: 200 }));

    const companies = await loadAllEditorialCompanies(new AbortController().signal, fetcher);

    expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual([
      '/api/admin/companies?limit=200&offset=0',
      '/api/admin/companies?limit=200&offset=200',
    ]);
    expect(companies).toHaveLength(205);
    expect(new Set(companies.map(({ id }) => id)).size).toBe(205);
  });

  it('rejects a premature empty page instead of returning a partial company list', async () => {
    const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({
        companies: Array.from({ length: 200 }, (_, index) => company(index)),
        total: 201,
        limit: 200,
        offset: 0,
      }))
      .mockResolvedValueOnce(jsonResponse({ companies: [], total: 201, limit: 200, offset: 200 }));

    await expect(loadAllEditorialCompanies(new AbortController().signal, fetcher))
      .rejects.toThrow('paginação de empresas terminou antes do total informado');
  });
});

describe('editorial workspace guard', () => {
  it('invalidates a pending mutation after company, post, or new-draft navigation', () => {
    const guard = createEditorialWorkspaceGuard();

    guard.transition('company-a', 'post-a');
    const original = guard.capture();
    expect(guard.isCurrent(original)).toBe(true);

    guard.transition('company-a', 'post-b');
    expect(guard.isCurrent(original)).toBe(false);

    const secondPost = guard.capture();
    guard.transition('company-a', null);
    expect(guard.isCurrent(secondPost)).toBe(false);

    const newDraft = guard.capture();
    guard.transition('company-b', null);
    expect(guard.isCurrent(newDraft)).toBe(false);
  });
});
