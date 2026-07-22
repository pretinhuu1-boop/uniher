import fs from 'fs';
import path from 'path';
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
  it('loads more than 200 companies across stable pages', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => company(index));
    const secondPage = Array.from({ length: 6 }, (_, index) => company(200 + index));
    const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ companies: firstPage, total: 206, limit: 200, offset: 0 }))
      .mockResolvedValueOnce(jsonResponse({ companies: secondPage, total: 206, limit: 200, offset: 200 }));

    const companies = await loadAllEditorialCompanies(new AbortController().signal, fetcher);

    expect(fetcher.mock.calls.map(([input]) => String(input))).toEqual([
      '/api/admin/companies?limit=200&offset=0',
      '/api/admin/companies?limit=200&offset=200',
    ]);
    expect(companies).toHaveLength(206);
    expect(new Set(companies.map(({ id }) => id)).size).toBe(206);
  });

  it('rejects overlapping pages instead of returning a partial unique list', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => company(index));
    const secondPage = [company(199), ...Array.from({ length: 5 }, (_, index) => company(200 + index))];
    const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ companies: firstPage, total: 206, limit: 200, offset: 0 }))
      .mockResolvedValueOnce(jsonResponse({ companies: secondPage, total: 206, limit: 200, offset: 200 }));

    await expect(loadAllEditorialCompanies(new AbortController().signal, fetcher))
      .rejects.toThrow('paginação de empresas retornou IDs duplicados');
  });

  it('requires the terminal unique company count to equal total', async () => {
    const fetcher = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ companies: [company(0), company(1)], total: 1, limit: 200, offset: 0 }));

    await expect(loadAllEditorialCompanies(new AbortController().signal, fetcher))
      .rejects.toThrow('paginação de empresas retornou uma contagem inconsistente');
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

describe('admin company pagination query', () => {
  it('uses a total order when companies share the same creation timestamp', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'companies', 'route.ts'),
      'utf8',
    );

    expect(source).toMatch(/ORDER BY c\.created_at DESC,\s*c\.id DESC/);
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
