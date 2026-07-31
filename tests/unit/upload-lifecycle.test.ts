import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const uploadDeps = vi.hoisted(() => ({
  saveUploadedFile: vi.fn(),
  removeUploadedFile: vi.fn(),
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
  removeUploadedFile: uploadDeps.removeUploadedFile,
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
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    'image.png',
    { type: 'image/png' },
  ));
  return new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
  });
}

const routes = [
  {
    name: 'avatar',
    handler: uploadAvatar,
    field: 'avatar_url',
    previousUrl: '/uploads/avatars/previousAvatar.png',
  },
  {
    name: 'logo',
    handler: uploadLogo,
    field: 'logo_url',
    previousUrl: '/uploads/logos/previousLogo.png',
  },
];

describe('upload replacement lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadDeps.checkUploadRateLimit.mockResolvedValue(undefined);
    uploadDeps.saveUploadedFile.mockResolvedValue({
      url: '/uploads/avatars/newUpload.png',
      filename: 'newUpload.png',
    });
    uploadDeps.removeUploadedFile.mockResolvedValue(true);
  });

  it.each(routes)('compensates the new $name upload when its pointer update fails', async ({ handler }) => {
    uploadDeps.enqueue.mockRejectedValue(new Error('pointer update failed'));

    const response = await handler(uploadRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    expect(uploadDeps.removeUploadedFile).toHaveBeenCalledWith('/uploads/avatars/newUpload.png');
  });

  it.each(routes)('compensates the new $name upload when no pointer row is updated', async ({
    handler,
    field,
  }) => {
    uploadDeps.enqueue.mockImplementation(async (operation: any) => operation({
      prepare: (sql: string) => sql.includes(`SELECT ${field}`)
        ? { get: () => null }
        : { run: () => ({ changes: 0 }) },
    }));

    const response = await handler(uploadRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    expect(uploadDeps.removeUploadedFile).toHaveBeenCalledTimes(1);
    expect(uploadDeps.removeUploadedFile).toHaveBeenCalledWith('/uploads/avatars/newUpload.png');
  });

  it.each(routes)('removes the previous $name only after its pointer update succeeds', async ({
    handler,
    field,
    previousUrl,
  }) => {
    let pointerUpdated = false;
    uploadDeps.enqueue.mockImplementation(async (operation: any) => operation({
      prepare: (sql: string) => {
        if (sql.includes(`SELECT ${field}`)) {
          return { get: () => ({ [field]: previousUrl }) };
        }
        if (sql.includes('UPDATE')) {
          return {
            run: () => {
              pointerUpdated = true;
              return { changes: 1 };
            },
          };
        }
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    }));
    uploadDeps.removeUploadedFile.mockImplementation(async () => {
      expect(pointerUpdated).toBe(true);
      return true;
    });

    const response = await handler(uploadRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(uploadDeps.removeUploadedFile).toHaveBeenCalledWith(previousUrl);
    expect(uploadDeps.removeUploadedFile).not.toHaveBeenCalledWith('/uploads/avatars/newUpload.png');
  });
});
