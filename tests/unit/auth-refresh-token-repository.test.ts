import { describe, expect, it, vi } from 'vitest';

const capturedSql: string[] = [];

vi.mock('@/lib/db', () => ({
  getReadDb: () => ({
    prepare: (sql: string) => {
      capturedSql.push(sql);
      return { get: () => undefined };
    },
  }),
  getWriteQueue: () => ({
    enqueue: async (callback: (db: { prepare: (sql: string) => { run: () => void } }) => unknown) => callback({
      prepare: (sql: string) => {
        capturedSql.push(sql);
        return { run: () => undefined };
      },
    }),
  }),
}));

import { cleanExpiredTokens, findByTokenHash } from '@/repositories/refresh-token.repository';

describe('refresh token repository sqlite time literals', () => {
  it('uses single-quoted now in expiry queries', async () => {
    capturedSql.length = 0;

    findByTokenHash('hash');
    await cleanExpiredTokens();

    expect(capturedSql.join('\n')).toContain("datetime('now')");
    expect(capturedSql.join('\n')).not.toContain('datetime("now")');
  });
});
