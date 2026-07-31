import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

describe('service worker cache version', () => {
  it('removes uniher-v3 and preserves uniher-v4 during activation', async () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
    const listeners = new Map<string, (event: any) => void>();
    const deleted: string[] = [];
    let activation: Promise<unknown> | undefined;

    vm.runInNewContext(source, {
      self: {
        addEventListener: (type: string, listener: (event: any) => void) => {
          listeners.set(type, listener);
        },
        clients: { claim: () => Promise.resolve() },
        skipWaiting: () => undefined,
        registration: { showNotification: () => Promise.resolve() },
      },
      clients: { openWindow: () => Promise.resolve() },
      caches: {
        keys: async () => ['uniher-v3', 'uniher-v4'],
        delete: async (key: string) => {
          deleted.push(key);
          return true;
        },
        open: async () => ({ addAll: async () => undefined }),
        match: async () => undefined,
      },
      fetch: async () => undefined,
      Response,
      URL,
    });

    listeners.get('activate')?.({
      waitUntil: (promise: Promise<unknown>) => {
        activation = promise;
      },
    });
    await activation;

    expect(deleted).toContain('uniher-v3');
    expect(deleted).not.toContain('uniher-v4');
  });

  it('uses uniher-v4 in the registration cache cleanup', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'ServiceWorkerRegistration.tsx'),
      'utf8',
    );

    expect(source).toContain("const CACHE_VERSION = 'uniher-v4'");
  });

  it('keeps an offline fallback only for the public landing navigation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'public', 'sw.js'),
      'utf8',
    );

    expect(source).toContain("const PUBLIC_OFFLINE_PATHS = new Set(['/'])");
    expect(source).toContain('PUBLIC_OFFLINE_PATHS.has(url.pathname)');
  });
});
