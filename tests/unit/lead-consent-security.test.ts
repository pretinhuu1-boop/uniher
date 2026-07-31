import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  createLead: vi.fn(),
  initDb: vi.fn(),
  checkWriteRateLimit: vi.fn(),
}));

vi.mock('@/repositories/lead.repository', () => ({
  createLead: deps.createLead,
}));

vi.mock('@/lib/db/init', () => ({
  initDb: deps.initDb,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkWriteRateLimit: deps.checkWriteRateLimit,
}));

import { POST } from '@/app/api/leads/route';

function leadRequest(consent: boolean) {
  return new Request('http://local/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lead Security',
      email: 'lead-security@example.com',
      consent,
      source: 'security-audit',
    }),
  });
}

describe('public lead consent security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.createLead.mockResolvedValue({ id: 'lead-1' });
  });

  it('rejects consent=false before persistence', async () => {
    const response = await POST(leadRequest(false));

    expect(response.status).toBe(400);
    expect(deps.createLead).not.toHaveBeenCalled();
  });

  it('accepts explicit consent=true', async () => {
    const response = await POST(leadRequest(true));

    expect(response.status).toBe(201);
    expect(deps.createLead).toHaveBeenCalledWith(expect.objectContaining({
      consent: true,
    }));
  });
});
