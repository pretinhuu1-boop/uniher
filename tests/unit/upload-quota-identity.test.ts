import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const uploadDeps = vi.hoisted(() => ({
  saveUploadedFile: vi.fn(),
  checkUploadRateLimit: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (req: NextRequest) => handler(req, {
    params: Promise.resolve({}),
    auth: { userId: 'user-1', companyId: 'company-1', role: 'colaboradora' },
  }),
  withRole: (..._roles: string[]) => (handler: any) => (req: NextRequest) => handler(req, {
    params: Promise.resolve({}),
    auth: { userId: 'rh-1', companyId: 'company-1', role: 'rh' },
  }),
}));

vi.mock('@/lib/upload', () => ({
  saveUploadedFile: uploadDeps.saveUploadedFile,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkUploadRateLimit: uploadDeps.checkUploadRateLimit,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({ enqueue: uploadDeps.enqueue }),
}));

import { POST as uploadAvatar } from '@/app/api/upload/avatar/route';
import { POST as uploadLogo } from '@/app/api/upload/logo/route';

function uploadRequest() {
  const formData = new FormData();
  formData.set('file', new File(
    [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
    'image.png',
    { type: 'image/png' },
  ));
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('upload quota identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadDeps.checkUploadRateLimit.mockResolvedValue(undefined);
    uploadDeps.saveUploadedFile.mockResolvedValue({
      url: '/uploads/test.png',
      filename: 'test.png',
    });
    uploadDeps.enqueue.mockImplementation(async (operation: any) => {
      operation({ prepare: () => ({ run: vi.fn() }) });
    });
  });

  it('attributes avatar storage to the authenticated user', async () => {
    const response = await uploadAvatar(uploadRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(uploadDeps.saveUploadedFile).toHaveBeenCalledWith(
      expect.any(File),
      'avatars',
      'user-1',
    );
  });

  it('attributes logo storage to the authenticated operator', async () => {
    const response = await uploadLogo(uploadRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(uploadDeps.saveUploadedFile).toHaveBeenCalledWith(
      expect.any(File),
      'logos',
      'rh-1',
    );
  });
});
