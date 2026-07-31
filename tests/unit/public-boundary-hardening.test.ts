import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { proxy } from '@/proxy';
import { getClientIp } from '@/lib/security/rate-limit';
import { saveUploadedFile } from '@/lib/upload';

describe('public boundary hardening', () => {
  it('does not treat an API path containing a dot as public', async () => {
    const response = await proxy(new NextRequest('http://localhost/api/company.json'));

    expect(response.status).toBe(401);
  });

  it('does not expose protected auth endpoints through a broad prefix', async () => {
    const response = await proxy(new NextRequest('http://localhost/api/auth/me'));

    expect(response.status).toBe(401);
  });

  it('keeps explicitly public framework assets accessible', async () => {
    const response = await proxy(new NextRequest('http://localhost/_next/static/chunk.js'));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/sw.js', '/manifest.json', '/robots.txt', '/sitemap.xml'])(
    'keeps required public PWA and discovery asset accessible: %s',
    async (route) => {
      const response = await proxy(new NextRequest(`http://localhost${route}`));

      expect(response.headers.get('x-middleware-next')).toBe('1');
    },
  );

  it('does not expose internal API documentation as a generic static asset', async () => {
    const response = await proxy(new NextRequest('http://localhost/api-docs.json'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth');
  });

  it('never stores authenticated HTML navigation in the service worker cache', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');

    expect(source).toContain(
      "if (!PUBLIC_OFFLINE_PATHS.has(url.pathname)) {\n      event.respondWith(fetch(event.request));",
    );
  });

  it('uses the trusted reverse-proxy address instead of a spoofed forwarded IP', () => {
    const request = new Request('http://localhost/api/auth/login', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.77, 203.0.113.10',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('falls back to the last forwarded hop when x-real-ip is absent', () => {
    const request = new Request('http://localhost/api/auth/login', {
      headers: {
        'x-forwarded-for': '198.51.100.77, 203.0.113.10',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('rejects SVG uploads because they can execute active content', async () => {
    const svg = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.domain)"/>'],
      'avatar.svg',
      { type: 'image/svg+xml' },
    );

    await expect(saveUploadedFile(svg, 'avatars', 'user-1'))
      .rejects.toThrow('Tipo de arquivo');
  });
});
