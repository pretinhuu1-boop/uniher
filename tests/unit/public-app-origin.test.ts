import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicAppOrigin } from '@/lib/security/public-app-origin';

describe('public application origin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts the canonical HTTPS origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://uniher.com.br/some/path');

    expect(getPublicAppOrigin()).toBe('https://uniher.com.br');
  });

  it.each([
    'http://uniher.com.br',
    'https://uniher.com.br.attacker.example',
    'http://localhost:3000',
  ])('rejects an untrusted production origin: %s', (origin) => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', origin);

    expect(() => getPublicAppOrigin()).toThrow(
      'Invalid production application origin',
    );
  });
});
