import { expect, type APIResponse } from '@playwright/test';

const PRIVACY_REVIEW_BODY = {
  status: 'unavailable',
  reason: 'privacy_review',
  message: 'Recurso temporariamente indispon\u00edvel durante a revis\u00e3o de privacidade.',
} as const;

const LEGACY_GAMIFICATION_KEY = /ranking|points?|xp|level|league|badges?/i;

export function extractAccessTokenFromSetCookie(response: APIResponse): string {
  const setCookie = response.headers()['set-cookie'] || '';
  const match = setCookie.match(/uniher-access-token=([^;]+)/);
  return match?.[1] || '';
}

export function expectPrivateResponse(response: APIResponse) {
  expect(response.headers()['cache-control']).toBe('private, no-store');
  const varyTokens = (response.headers().vary ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase());
  expect(varyTokens).toContain('cookie');
}

export function expectNoRecursiveKeys(
  payload: unknown,
  forbiddenKey: RegExp,
  canaries: readonly string[] = [],
) {
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object' || value === null) return;

    for (const [key, nestedValue] of Object.entries(value)) {
      expect(key, `forbidden response key: ${key}`).not.toMatch(forbiddenKey);
      visit(nestedValue);
    }
  }

  visit(payload);
  const serialized = JSON.stringify(payload);
  for (const canary of canaries.filter(Boolean)) {
    expect(serialized).not.toContain(canary);
  }
}

export async function expectPrivacyReviewResponse(
  response: APIResponse,
  canaries: readonly string[] = [],
) {
  expect(response.status()).toBe(410);
  expectPrivateResponse(response);
  const body = await response.json();
  expect(body).toEqual(PRIVACY_REVIEW_BODY);
  expectNoRecursiveKeys(body, LEGACY_GAMIFICATION_KEY, canaries);
}
