import { describe, expect, it, vi } from 'vitest';

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  default: fsMock,
  ...fsMock,
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'fixed-upload-id',
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    throw new Error('db should not be used without user storage tracking');
  },
  getWriteQueue: () => {
    throw new Error('write queue should not be used without user storage tracking');
  },
}));

import { saveUploadedFile } from '@/lib/upload';

describe('upload SVG boundary', () => {
  it('rejects SVG uploads before writing to public/uploads', async () => {
    const svg = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      'logo.svg',
      { type: 'image/svg+xml' },
    );

    await expect(saveUploadedFile(svg, 'general')).rejects.toThrow(/n.o permitido/i);
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects RIFF files that are not real WebP images', async () => {
    const riffAvi = new File(
      [Buffer.from([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20])],
      'clip.webp',
      { type: 'image/webp' },
    );

    await expect(saveUploadedFile(riffAvi, 'general')).rejects.toThrow(/nao corresponde/i);
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it('keeps SVG out of the central upload allowlist and client-error classifiers', async () => {
    const { readFileSync } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const uploadHelper = readFileSync('src/lib/upload/index.ts', 'utf8');
    const uploadRoutes = [
      'src/app/api/upload/route.ts',
      'src/app/api/upload/avatar/route.ts',
      'src/app/api/upload/logo/route.ts',
    ].map((file) => readFileSync(file, 'utf8'));

    expect(uploadHelper).not.toMatch(/image\/svg\+xml|'svg'|SVG/);
    for (const route of uploadRoutes) {
      expect(route).toMatch(/nao permitido/);
      expect(route).toMatch(/nao corresponde/);
      expect(route).toMatch(/isClientUploadError/);
    }
  });
});
