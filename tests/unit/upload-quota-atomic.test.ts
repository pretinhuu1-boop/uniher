import fs from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WriteQueue } from '@/lib/db/write-queue';

const deps = vi.hoisted(() => ({
  db: null as Database.Database | null,
  writeQueue: null as WriteQueue | null,
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => deps.writeQueue,
}));

import { saveUploadedFile } from '@/lib/upload';

const MIB = 1024 * 1024;

function pngFile(name: string, size: number): File {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47]);
  return new File([bytes], name, { type: 'image/png' });
}

function uploadRows(): Array<{ file_path: string; file_size: number }> {
  return deps.db!
    .prepare('SELECT file_path, file_size FROM user_uploads ORDER BY created_at, id')
    .all() as Array<{ file_path: string; file_size: number }>;
}

describe('atomic upload quota reservation', () => {
  beforeEach(() => {
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE user_uploads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        category TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    deps.writeQueue = new WriteQueue(deps.db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deps.writeQueue?.destroy();
    deps.db?.close();
    deps.writeQueue = null;
    deps.db = null;
  });

  it('reserves quota before writing the file', async () => {
    let rowsAtWrite = 0;
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      rowsAtWrite = uploadRows().length;
    });

    await saveUploadedFile(pngFile('avatar.png', 1024), 'avatars', 'user-1');

    expect(rowsAtWrite).toBe(1);
    expect(uploadRows()).toHaveLength(1);
  });

  it('removes the reservation when the file write fails', async () => {
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disk full');
    });

    await expect(
      saveUploadedFile(pngFile('avatar.png', 1024), 'avatars', 'user-1'),
    ).rejects.toThrow('disk full');

    expect(uploadRows()).toEqual([]);
  });

  it('accepts only one of two concurrent reservations that exceed the remaining quota', async () => {
    deps.db!.prepare(`
      INSERT INTO user_uploads (id, user_id, file_path, file_size, category)
      VALUES ('existing', 'user-1', '/uploads/general/existing.png', ?, 'general')
    `).run(45 * MIB);
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    const results = await Promise.allSettled([
      saveUploadedFile(pngFile('first.png', 3 * MIB), 'general', 'user-1'),
      saveUploadedFile(pngFile('second.png', 3 * MIB), 'general', 'user-1'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(uploadRows()).toHaveLength(2);
    expect(uploadRows().reduce((total, row) => total + row.file_size, 0)).toBe(48 * MIB);
  });
});
