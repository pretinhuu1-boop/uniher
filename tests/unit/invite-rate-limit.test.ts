import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitError } from '@/lib/errors';

const limiterState = vi.hoisted(() => ({
  calls: [] as Array<{ keyPrefix: string; key: string }>,
  rejectedPrefixes: new Set<string>(),
}));

vi.mock('rate-limiter-flexible', () => ({
  RateLimiterMemory: class {
    private readonly keyPrefix: string;

    constructor(options: { keyPrefix: string }) {
      this.keyPrefix = options.keyPrefix;
    }

    async consume(key: string) {
      limiterState.calls.push({ keyPrefix: this.keyPrefix, key });
      if (limiterState.rejectedPrefixes.has(this.keyPrefix)) {
        throw new Error('rate limit exceeded');
      }
    }
  },
}));

import * as rateLimit from '@/lib/security/rate-limit';

type InviteRateLimitCheck = (req: Request, token: string) => Promise<void>;

function getInviteRateLimitCheck(): InviteRateLimitCheck {
  return (rateLimit as unknown as { checkInviteAcceptRateLimit: InviteRateLimitCheck })
    .checkInviteAcceptRateLimit;
}

describe('invite acceptance rate limit', () => {
  beforeEach(() => {
    limiterState.calls.length = 0;
    limiterState.rejectedPrefixes.clear();
  });

  it('uses independent IP and SHA-256 token buckets without exposing the raw token', async () => {
    const token = 'raw-invite-token-secret';
    const req = new Request('http://localhost/api/invites/token', {
      headers: { 'x-real-ip': '203.0.113.17' },
    });

    await getInviteRateLimitCheck()(req, token);

    expect(limiterState.calls).toContainEqual({
      keyPrefix: 'invite-accept-ip',
      key: '203.0.113.17',
    });
    expect(limiterState.calls).toContainEqual({
      keyPrefix: 'invite-accept-token',
      key: createHash('sha256').update(token).digest('hex'),
    });
    expect(limiterState.calls.some(({ key }) => key.includes(token))).toBe(false);
  });

  it('normalizes limiter exhaustion to the API rate-limit error', async () => {
    limiterState.rejectedPrefixes.add('invite-accept-token');

    await expect(getInviteRateLimitCheck()(
      new Request('http://localhost/api/invites/token'),
      'another-invite-token',
    )).rejects.toBeInstanceOf(RateLimitError);
  });
});
