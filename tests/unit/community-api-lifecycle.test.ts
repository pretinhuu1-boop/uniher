import Database from 'better-sqlite3';
import { describe, expect, it, vi } from 'vitest';

import type { AuthContext } from '@/lib/auth/middleware';
import { runCollaboratorCommunityRead } from '@/lib/community/api';
import { AppError } from '@/lib/errors';
import { RateLimitError } from '@/lib/errors';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';

function requestFrom(ip: string): Request {
  return new Request('http://localhost/api/collaborator/feed/post/support', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  });
}

describe('authenticated community write rate limiting', () => {
  it('does not let one user rotate forwarded IPs to bypass the write bucket', async () => {
    const userId = `rate-user-rotate-${Date.now()}`;
    for (let index = 0; index < 30; index += 1) {
      await expect(checkWriteRateLimit(requestFrom(`198.51.100.${index + 1}`), userId))
        .resolves.toBeUndefined();
    }

    await expect(checkWriteRateLimit(requestFrom('203.0.113.250'), userId))
      .rejects.toBeInstanceOf(RateLimitError);
  });

  it('gives two authenticated users on the same IP independent buckets', async () => {
    const suffix = Date.now();
    const userA = `rate-user-a-${suffix}`;
    const userB = `rate-user-b-${suffix}`;
    const request = requestFrom('192.0.2.44');

    for (let index = 0; index < 30; index += 1) {
      await expect(checkWriteRateLimit(request, userA)).resolves.toBeUndefined();
      await expect(checkWriteRateLimit(request, userB)).resolves.toBeUndefined();
    }

    await expect(checkWriteRateLimit(request, userA)).rejects.toBeInstanceOf(RateLimitError);
    await expect(checkWriteRateLimit(request, userB)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('retains IP limiting when no authenticated subject is provided', async () => {
    const request = requestFrom('192.0.2.201');
    for (let index = 0; index < 30; index += 1) {
      await expect(checkWriteRateLimit(request)).resolves.toBeUndefined();
    }
    await expect(checkWriteRateLimit(request)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe('collaborator community read snapshot', () => {
  function context(userId: string): AuthContext {
    return {
      auth: { userId, role: 'rh', companyId: 'company-a' },
      params: Promise.resolve({}),
    };
  }

  function database(): Database.Database {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        also_collaborator INTEGER NOT NULL DEFAULT 0,
        approved INTEGER NOT NULL DEFAULT 1,
        blocked INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
      );
      INSERT INTO users (id, role, also_collaborator)
      VALUES ('dual-user', 'rh', 1), ('revoked-user', 'rh', 0);
    `);
    return db;
  }

  it('runs persisted capability and the complete read callback in one synchronous transaction', () => {
    const db = database();
    try {
      const result = runCollaboratorCommunityRead(context('dual-user'), db, () => ({
        inTransaction: db.inTransaction,
        capabilityAtRead: db.prepare('SELECT also_collaborator FROM users WHERE id = ?')
          .pluck()
          .get('dual-user'),
      }));

      expect(result).toEqual({ inTransaction: true, capabilityAtRead: 1 });
      expect(db.inTransaction).toBe(false);
    } finally {
      db.close();
    }
  });

  it('does not run the read callback after persisted capability is revoked', () => {
    const db = database();
    const read = vi.fn();
    try {
      expect(() => runCollaboratorCommunityRead(context('revoked-user'), db, read))
        .toThrowError(expect.objectContaining<Partial<AppError>>({
          statusCode: 403,
          code: 'COLLABORATOR_CAPABILITY_REQUIRED',
        }));
      expect(read).not.toHaveBeenCalled();
    } finally {
      db.close();
    }
  });
});
