import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const boundary = vi.hoisted(() => ({
  saveUploadedFile: vi.fn(async () => ({ url: '/uploads/fixed.png', filename: 'fixed.png' })),
  updates: [] as Array<{ sql: string; params: unknown[] }>,
}));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return {
    withAuth: expose,
    withRole: () => expose,
  };
});

vi.mock('@/lib/security/rate-limit', () => ({
  checkUploadRateLimit: async () => undefined,
}));

vi.mock('@/lib/upload', () => ({
  saveUploadedFile: boundary.saveUploadedFile,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({
    enqueue: async (operation: (db: unknown) => unknown) => operation({
      prepare: (sql: string) => ({
        run: (...params: unknown[]) => {
          boundary.updates.push({ sql, params });
        },
      }),
    }),
  }),
}));

import { POST as postAvatar } from '@/app/api/upload/avatar/route';
import { POST as postLogo } from '@/app/api/upload/logo/route';

function uploadRequest(): Request {
  const form = new FormData();
  form.set('file', new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' }));
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: form,
  });
}

describe('upload user tracking boundary', () => {
  beforeEach(() => {
    boundary.saveUploadedFile.mockClear();
    boundary.updates = [];
  });

  it('passes the authenticated user id when saving avatars', async () => {
    const response = await postAvatar(uploadRequest() as any, {
      auth: { userId: 'collab-a', role: 'colaboradora', companyId: 'company-a' },
    } as any);

    expect(response.status).toBe(200);
    expect(boundary.saveUploadedFile).toHaveBeenCalledWith(expect.any(File), 'avatars', 'collab-a');
    expect(boundary.updates).toEqual([
      expect.objectContaining({ params: ['/uploads/fixed.png', 'collab-a'] }),
    ]);
  });

  it('passes the authenticated user id when saving company logos', async () => {
    const response = await postLogo(uploadRequest() as any, {
      auth: { userId: 'rh-a', role: 'rh', companyId: 'company-a' },
    } as any);

    expect(response.status).toBe(200);
    expect(boundary.saveUploadedFile).toHaveBeenCalledWith(expect.any(File), 'logos', 'rh-a');
    expect(boundary.updates).toEqual([
      expect.objectContaining({ params: ['/uploads/fixed.png', 'company-a'] }),
    ]);
  });

  it('keeps company logo upload UI aligned with the accepted image contract', () => {
    const companyProfile = readFileSync('src/app/(platform)/company-profile/page.tsx', 'utf8');

    expect(companyProfile).toContain('accept="image/png,image/jpeg,image/webp"');
    expect(companyProfile).toContain('PNG, JPG ou WebP ate 5MB');
    expect(companyProfile).not.toMatch(/SVG|image\/svg/i);
  });
});
