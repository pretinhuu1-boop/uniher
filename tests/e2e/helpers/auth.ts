import type { APIResponse } from '@playwright/test';

export function extractAccessTokenFromSetCookie(response: APIResponse): string {
  const setCookie = response.headers()['set-cookie'] || '';
  const match = setCookie.match(/uniher-access-token=([^;]+)/);
  return match?.[1] || '';
}
