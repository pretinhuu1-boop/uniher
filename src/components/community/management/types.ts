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
