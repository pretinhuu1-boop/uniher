import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerMock, initDbMock, checkAuthRateLimitMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  initDbMock: vi.fn(),
  checkAuthRateLimitMock: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({
  register: registerMock,
}));

vi.mock('@/lib/db/init', () => ({
  initDb: initDbMock,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkAuthRateLimit: checkAuthRateLimitMock,
}));

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: (response: Response) => response,
}));

import { POST } from '@/app/api/auth/register/route';

function registrationRequest(body: Record<string, unknown>) {
  return new Request('http://local/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('public registration security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerMock.mockResolvedValue({
      user: { id: 'new-rh', role: 'rh', is_master_admin: 0 },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('rejects anonymous attempts to create a master admin in an existing company', async () => {
    const response = await POST(registrationRequest({
      name: 'Attacker Admin',
      email: 'attacker@example.com',
      password: 'Secure@2026',
      role: 'admin',
      companyId: 'existing-company',
    }));

    expect(response.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('rejects anonymous RH registration into an existing company', async () => {
    const response = await POST(registrationRequest({
      name: 'Attacker RH',
      email: 'attacker-rh@example.com',
      password: 'Secure@2026',
      role: 'rh',
      companyId: 'existing-company',
    }));

    expect(response.status).toBe(400);
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('allows public onboarding only for RH with a new company', async () => {
    const response = await POST(registrationRequest({
      name: 'New RH',
      email: 'new-rh@example.com',
      password: 'Secure@2026',
      role: 'rh',
      company: {
        name: 'New Company',
        cnpj: '12.345.678/0001-90',
      },
    }));

    expect(response.status).toBe(201);
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({
      role: 'rh',
      company: expect.objectContaining({ name: 'New Company' }),
    }));
  });
});
