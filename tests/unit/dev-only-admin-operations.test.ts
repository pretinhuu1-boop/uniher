import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  actorActive: true,
  db: {},
  closeDb: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 1024 })),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
  execSync: vi.fn(() => ''),
  hasActiveMasterAdminActor: vi.fn(() => true),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withMasterAdmin: (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: {
      userId: 'admin-1',
      companyId: '',
      role: 'admin',
      isMasterAdmin: true,
    },
  }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  closeDb: deps.closeDb,
}));

vi.mock('@/lib/security/active-rh-actor', () => ({
  hasActiveMasterAdminActor: deps.hasActiveMasterAdminActor,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: deps.existsSync,
    mkdirSync: deps.mkdirSync,
    copyFileSync: deps.copyFileSync,
    statSync: deps.statSync,
    writeFileSync: deps.writeFileSync,
    rmSync: deps.rmSync,
    unlinkSync: deps.unlinkSync,
    readFileSync: deps.readFileSync,
    readdirSync: deps.readdirSync,
  },
}));

vi.mock('child_process', () => ({
  execSync: deps.execSync,
}));

import { devOnlyGuard } from '@/lib/api/dev-only';
import { POST as createBackup } from '@/app/api/admin/system/backup/route';
import { POST as clearLogs } from '@/app/api/admin/system/clear-logs/route';
import { POST as runOperation } from '@/app/api/admin/system/ops/route';

function request(
  path: string,
  body: Record<string, unknown> = {},
  options: {
    baseUrl?: string;
    origin?: string | null;
    forwardedFor?: string;
    realIp?: string;
  } = {},
): NextRequest {
  const baseUrl = options.baseUrl ?? 'http://localhost:3000';
  const headers = new Headers({ 'content-type': 'application/json' });
  const origin = options.origin === undefined ? 'http://localhost:3000' : options.origin;

  if (origin) headers.set('origin', origin);
  if (options.forwardedFor) headers.set('x-forwarded-for', options.forwardedFor);
  if (options.realIp) headers.set('x-real-ip', options.realIp);

  return new NextRequest(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const routeContext = { params: Promise.resolve({}) };

describe('devOnlyGuard trusted loopback boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed in production even for a loopback request', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(devOnlyGuard(request('/api/admin/system/ops'))?.status).toBe(403);
  });

  it.each([
    {
      name: 'missing Origin',
      options: { origin: null },
    },
    {
      name: 'public Origin',
      options: { origin: 'https://attacker.example' },
    },
    {
      name: 'different loopback Origin',
      options: { origin: 'http://localhost:4000' },
    },
    {
      name: 'public request host',
      options: { baseUrl: 'https://staging.uniher.com.br' },
    },
    {
      name: 'public forwarded client',
      options: { forwardedFor: '203.0.113.10' },
    },
    {
      name: 'public real client',
      options: { realIp: '203.0.113.10' },
    },
  ])('blocks $name outside production', ({ options }) => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(devOnlyGuard(request('/api/admin/system/ops', {}, options))?.status).toBe(403);
  });

  it.each([
    ['IPv4 localhost', 'http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['localhost', 'http://localhost:3000', 'http://localhost:3000'],
    ['IPv6 localhost', 'http://[::1]:3000', 'http://[::1]:3000'],
  ])('allows a trusted %s request outside production', (_name, baseUrl, origin) => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(devOnlyGuard(request('/api/admin/system/ops', {}, { baseUrl, origin }))).toBeNull();
  });
});

describe('dev-only destructive operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.stubEnv('NODE_ENV', 'development');
    deps.actorActive = true;
    deps.existsSync.mockReturnValue(true);
    deps.statSync.mockReturnValue({ size: 1024 });
    deps.hasActiveMasterAdminActor.mockImplementation(() => deps.actorActive);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('revalidates the actor before creating a database backup', async () => {
    deps.actorActive = false;

    const response = await createBackup(request('/api/admin/system/backup'), routeContext);

    expect(response.status).toBe(403);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(deps.mkdirSync).not.toHaveBeenCalled();
    expect(deps.copyFileSync).not.toHaveBeenCalled();
  });

  it('revalidates the actor before truncating logs', async () => {
    deps.actorActive = false;

    const response = await clearLogs(
      request('/api/admin/system/clear-logs', { type: 'all' }),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(deps.writeFileSync).not.toHaveBeenCalled();
  });

  it('revalidates the actor before removing the build cache', async () => {
    deps.actorActive = false;

    const response = await runOperation(
      request('/api/admin/system/ops', { action: 'clear-cache' }),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(deps.rmSync).not.toHaveBeenCalled();
  });

  it('revalidates the actor before resetting the database', async () => {
    deps.actorActive = false;

    const response = await runOperation(
      request('/api/admin/system/ops', { action: 'reset-db' }),
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(deps.closeDb).not.toHaveBeenCalled();
    expect(deps.unlinkSync).not.toHaveBeenCalled();
    expect(deps.execSync).not.toHaveBeenCalled();
  });

  it('revalidates the actor inside the delayed restart callback', async () => {
    vi.useFakeTimers();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const response = await runOperation(
      request('/api/admin/system/ops', { action: 'restart' }),
      routeContext,
    );
    deps.actorActive = false;
    await vi.advanceTimersByTimeAsync(500);

    expect(response.status).toBe(200);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(exit).not.toHaveBeenCalled();
  });

  it('keeps restart functional while the actor remains active', async () => {
    vi.useFakeTimers();
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    const response = await runOperation(
      request('/api/admin/system/ops', { action: 'restart' }),
      routeContext,
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(response.status).toBe(200);
    expect(deps.hasActiveMasterAdminActor).toHaveBeenCalledWith(deps.db, 'admin-1');
    expect(exit).toHaveBeenCalledWith(0);
  });
});
