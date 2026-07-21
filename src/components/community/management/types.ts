import type { CommunityPostStatus, CommunityTopic } from '@/types/community';

export interface ManagedCommunityPost {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  topic: CommunityTopic;
  readTimeMinutes: number;
  imagePath: string | null;
  status: CommunityPostStatus;
  publishedAt?: string | null;
  expiresAt?: string | null;
}

export interface EditorialCompany {
  id: string;
  name: string;
  trade_name: string | null;
  is_active: number | boolean;
}

export interface AdminCompaniesResponse {
  companies: EditorialCompany[];
  total: number;
  limit: number;
  offset: number;
}

export interface EditorialWorkspaceSnapshot {
  epoch: number;
  companyId: string | null;
  postId: string | null;
}

export interface EditorialWorkspaceGuard {
  transition: (companyId: string | null, postId: string | null) => void;
  adoptPost: (postId: string | null) => void;
  capture: () => EditorialWorkspaceSnapshot;
  isCurrent: (snapshot: EditorialWorkspaceSnapshot) => boolean;
}

type CompaniesFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
}

export async function loadAllEditorialCompanies(
  signal: AbortSignal,
  fetcher: CompaniesFetcher = fetch,
): Promise<EditorialCompany[]> {
  const companiesById = new Map<string, EditorialCompany>();
  let loaded = 0;
  let total = 0;

  do {
    throwIfAborted(signal);
    const response = await fetcher(`/api/admin/companies?limit=200&offset=${loaded}`, {
      signal,
      cache: 'no-store',
    });
    throwIfAborted(signal);

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(payload?.message ?? payload?.error ?? 'Não foi possível carregar as empresas.');
    }

    const payload = await response.json() as AdminCompaniesResponse;
    throwIfAborted(signal);
    if (!Array.isArray(payload.companies) || !Number.isInteger(payload.total) || payload.total < 0) {
      throw new Error('A API retornou uma lista de empresas inválida.');
    }

    total = payload.total;
    if (payload.companies.length === 0 && loaded < total) {
      throw new Error('A paginação de empresas terminou antes do total informado.');
    }

    for (const company of payload.companies) companiesById.set(company.id, company);
    loaded += payload.companies.length;
  } while (loaded < total);

  return [...companiesById.values()];
}

export function createEditorialWorkspaceGuard(): EditorialWorkspaceGuard {
  let current: EditorialWorkspaceSnapshot = { epoch: 0, companyId: null, postId: null };

  return {
    transition(companyId, postId) {
      current = { epoch: current.epoch + 1, companyId, postId };
    },
    adoptPost(postId) {
      current = { ...current, postId };
    },
    capture() {
      return { ...current };
    },
    isCurrent(snapshot) {
      return snapshot.epoch === current.epoch
        && snapshot.companyId === current.companyId
        && snapshot.postId === current.postId;
    },
  };
}

export interface CommunityPostFormValue {
  title: string;
  summary: string;
  bodyText: string;
  topic: CommunityTopic;
  readTimeMinutes: number;
  imagePath: string;
  expiresAt: string;
}

export type CommunityPostField = keyof CommunityPostFormValue;
export type CommunityPostFieldErrors = Partial<Record<CommunityPostField, string>>;

export const EMPTY_COMMUNITY_POST_FORM: CommunityPostFormValue = {
  title: '',
  summary: '',
  bodyText: '',
  topic: 'geral',
  readTimeMinutes: 5,
  imagePath: '',
  expiresAt: '',
};

const encodedPathSeparatorPattern = /%(?:2f|5c)/i;
const localProtocolPattern = /(?:https?|javascript|data):/i;

function isSafeLocalPathStage(value: string): boolean {
  if (!value.startsWith('/') || value.includes('//') || value.includes('\\')) return false;
  if (encodedPathSeparatorPattern.test(value) || localProtocolPattern.test(value)) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;

  return value
    .slice(1)
    .split('/')
    .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isSafeLocalImagePath(value: string): boolean {
  let stage = value;

  for (let pass = 0; pass <= 4; pass += 1) {
    if (!isSafeLocalPathStage(stage)) return false;
    if (!stage.includes('%')) return true;
    if (pass === 4) return false;

    try {
      stage = decodeURIComponent(stage);
    } catch {
      return false;
    }
  }

  return false;
}

export function validateCommunityPostForm(value: CommunityPostFormValue): CommunityPostFieldErrors {
  const errors: CommunityPostFieldErrors = {};
  const titleLength = value.title.trim().length;
  const summaryLength = value.summary.trim().length;
  const bodyLength = value.bodyText.trim().length;
  const htmlMarkupPattern = /<[^>]*>/;

  if (titleLength < 3 || titleLength > 120) {
    errors.title = 'Use entre 3 e 120 caracteres.';
  } else if (htmlMarkupPattern.test(value.title)) {
    errors.title = 'Use apenas texto simples, sem marcação HTML.';
  }
  if (summaryLength < 10 || summaryLength > 240) {
    errors.summary = 'Use entre 10 e 240 caracteres.';
  } else if (htmlMarkupPattern.test(value.summary)) {
    errors.summary = 'Use apenas texto simples, sem marcação HTML.';
  }
  if (bodyLength < 20 || bodyLength > 8000) {
    errors.bodyText = 'Use entre 20 e 8.000 caracteres.';
  } else if (htmlMarkupPattern.test(value.bodyText)) {
    errors.bodyText = 'Use apenas texto simples, sem marcação HTML.';
  }
  if (!Number.isInteger(value.readTimeMinutes) || value.readTimeMinutes < 1 || value.readTimeMinutes > 60) {
    errors.readTimeMinutes = 'Informe um número inteiro entre 1 e 60.';
  }
  if (value.imagePath.trim() && !isSafeLocalImagePath(value.imagePath.trim())) {
    errors.imagePath = 'Use um caminho local seguro iniciado por /, sem URL externa ou navegação de pastas.';
  }
  if (value.expiresAt && Number.isNaN(new Date(value.expiresAt).getTime())) {
    errors.expiresAt = 'Informe uma data e hora válidas.';
  }

  return errors;
}

export function toCommunityPostForm(post: ManagedCommunityPost): CommunityPostFormValue {
  return {
    title: post.title,
    summary: post.summary,
    bodyText: post.bodyText,
    topic: post.topic,
    readTimeMinutes: post.readTimeMinutes,
    imagePath: post.imagePath ?? '',
    expiresAt: toDateTimeLocal(post.expiresAt),
  };
}

export function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function toApiExpiry(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
