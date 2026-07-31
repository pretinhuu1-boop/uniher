import { describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { WriteQueue } from '@/lib/db/write-queue';

describe('write queue retry policy', () => {
  it('does not move an explicitly non-retryable operation to the DLQ', async () => {
    const queue = new WriteQueue({} as Database.Database);

    await expect(queue.enqueue(
      () => {
        throw new Error('SQLITE_BUSY');
      },
      'non-retryable pointer update',
      { retryOnFailure: false },
    )).rejects.toThrow('SQLITE_BUSY');

    expect(queue.dlqSize).toBe(0);
    queue.destroy();
  });
});
