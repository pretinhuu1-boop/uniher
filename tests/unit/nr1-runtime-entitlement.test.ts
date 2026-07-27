import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  authToken: null as string | null,
  tokenBlacklisted: false,
  tokenPayload: null as {
    userId: string;
    companyId?: string | null;
    role: string;
  } | null,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: () => (handler: (...args: unknown[]) => unknown) => handler,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkReadRateLimit: async () => undefined,
  checkWriteRateLimit: async () => undefined,
}));

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('Test database is not configured');
    return boundary.db;
  },
}));
vi.mock('@/lib/auth/cookies', () => ({
  getAccessToken: async () => boundary.authToken,
}));
vi.mock('@/lib/auth/jwt', () => ({
  verifyAccessToken: async () => {
    if (!boundary.tokenPayload) throw new Error('Test token payload is not configured');
    return boundary.tokenPayload;
  },
}));
vi.mock('@/lib/auth/token-blacklist', () => ({
  isTokenBlacklisted: () => boundary.tokenBlacklisted,
}));

import { GET as bootstrapCopsoq } from '@/app/api/yavix/copsoq/bootstrap/route';
import { PATCH as answerCopsoq } from '@/app/api/yavix/copsoq/answer/route';
import { PUT as submitCopsoq } from '@/app/api/yavix/copsoq/submit/route';
import {
  hasActiveNr1PsychosocialConsent,
  getNr1RuntimeEntitlementForCurrentRequest,
  isNr1RuntimeEntitledForCompany,
  requireNr1PsychosocialConsent,
  requireNr1RuntimeEntitlement,
} from '@/lib/nr1/runtime-entitlement';
import { isYavixMock } from '@/lib/yavix/config';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE company_modules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      module_slug TEXT NOT NULL,
      module_state TEXT NOT NULL,
      visible INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );
    CREATE TABLE user_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      granted INTEGER NOT NULL DEFAULT 1,
      ip_address TEXT,
      user_agent TEXT,
      granted_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    INSERT INTO company_modules (
      id, company_id, module_slug, module_state, visible, notes, created_at, updated_at, updated_by
    ) VALUES
      ('company-enabled-nr1', 'company-enabled', 'nr1', 'enabled', 1, null, '2026-07-23T22:00:00.000Z', '2026-07-23T22:00:00.000Z', null),
      ('company-contract-nr1', 'company-contract', 'nr1', 'requires_contract', 1, null, '2026-07-23T22:00:00.000Z', '2026-07-23T22:00:00.000Z', null),
      ('company-hidden-nr1', 'company-hidden', 'nr1', 'enabled', 0, null, '2026-07-23T22:00:00.000Z', '2026-07-23T22:00:00.000Z', null);
  `);
  return db;
}

function grantNr1Consent(userId: string, revoked = false): void {
  if (!boundary.db) throw new Error('Test database is not configured');
  boundary.db.prepare(
    'INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    `consent-${userId}-${revoked ? 'revoked' : 'active'}`,
    userId,
    'nr1_psychosocial',
    1,
    '127.0.0.1',
    'vitest',
    revoked ? '2026-07-27T00:00:00.000Z' : null,
  );
}

async function getBootstrap(companyId: string): Promise<Response> {
  const handler = bootstrapCopsoq as unknown as (
    request: NextRequest,
    context: {
      auth: { userId: string; companyId: string; role: string };
      params: Promise<Record<string, string>>;
    },
  ) => Promise<Response>;

  return handler(
    new Request('http://localhost/api/yavix/copsoq/bootstrap?locale=pt') as unknown as NextRequest,
    {
      auth: { userId: 'nr1-user', companyId, role: 'colaboradora' },
      params: Promise.resolve({}),
    },
  );
}

async function patchAnswer(userId: string): Promise<Response> {
  const handler = answerCopsoq as unknown as (
    request: NextRequest,
    context: {
      auth: { userId: string; companyId: string; role: string };
      params: Promise<Record<string, string>>;
    },
  ) => Promise<Response>;

  return handler(
    new Request('http://localhost/api/yavix/copsoq/answer', {
      method: 'PATCH',
      body: JSON.stringify({ code: 2, value: '5' }),
    }) as unknown as NextRequest,
    {
      auth: { userId, companyId: 'company-enabled', role: 'colaboradora' },
      params: Promise.resolve({}),
    },
  );
}

async function putSubmit(userId: string): Promise<Response> {
  const handler = submitCopsoq as unknown as (
    request: NextRequest,
    context: {
      auth: { userId: string; companyId: string; role: string };
      params: Promise<Record<string, string>>;
    },
  ) => Promise<Response>;

  return handler(
    new Request('http://localhost/api/yavix/copsoq/submit', { method: 'PUT' }) as unknown as NextRequest,
    {
      auth: { userId, companyId: 'company-enabled', role: 'colaboradora' },
      params: Promise.resolve({}),
    },
  );
}

beforeEach(() => {
  vi.stubEnv('YAVIX_MOCK', '1');
  boundary.db = createDatabase();
  boundary.authToken = null;
  boundary.tokenBlacklisted = false;
  boundary.tokenPayload = null;
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
  vi.unstubAllEnvs();
});

describe('NR-1 runtime entitlement', () => {
  it('requires an explicit visible enabled company module row', async () => {
    await expect(isNr1RuntimeEntitledForCompany('company-enabled')).resolves.toBe(true);
    await expect(isNr1RuntimeEntitledForCompany('company-contract')).resolves.toBe(false);
    await expect(isNr1RuntimeEntitledForCompany('company-hidden')).resolves.toBe(false);
    await expect(isNr1RuntimeEntitledForCompany('company-missing')).resolves.toBe(false);
    await expect(isNr1RuntimeEntitledForCompany('')).resolves.toBe(false);
  });

  it('returns a blocking response when COPSOQ runtime is not entitled', async () => {
    const missingCompany = await requireNr1RuntimeEntitlement({ companyId: '' });
    expect(missingCompany?.status).toBe(404);

    const notEnabled = await requireNr1RuntimeEntitlement({ companyId: 'company-contract' });
    expect(notEnabled?.status).toBe(403);
    await expect(notEnabled?.json()).resolves.toMatchObject({
      error: 'Modulo NR-1 nao habilitado para esta empresa',
    });

    await expect(requireNr1RuntimeEntitlement({ companyId: 'company-enabled' })).resolves.toBeNull();
  });

  it('blocks direct COPSOQ bootstrap unless the company has enabled NR-1', async () => {
    const blocked = await getBootstrap('company-contract');
    expect(blocked.status).toBe(403);
    await expect(blocked.json()).resolves.toMatchObject({
      error: 'Modulo NR-1 nao habilitado para esta empresa',
    });

    const allowed = await getBootstrap('company-enabled');
    expect(allowed.status).toBe(200);
    await expect(allowed.json()).resolves.toMatchObject({ formName: 'COPSOQ41' });
  });

  it('keeps the Yavix mock disabled outside dev/test even when YAVIX_MOCK is set', () => {
    vi.stubEnv('YAVIX_MOCK', '1');
    vi.stubEnv('NODE_ENV', 'test');
    expect(isYavixMock()).toBe(true);

    vi.stubEnv('NODE_ENV', 'production');
    expect(isYavixMock()).toBe(false);

    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('YAVIX_MOCK', 'true');
    expect(isYavixMock()).toBe(false);
  });

  it('requires active NR-1 psychosocial consent before answer and submit mutations', async () => {
    await expect(hasActiveNr1PsychosocialConsent('nr1-consent-user')).resolves.toBe(false);
    const directBlock = await requireNr1PsychosocialConsent('nr1-consent-user');
    expect(directBlock?.status).toBe(403);

    grantNr1Consent('nr1-consent-user', true);
    await expect(hasActiveNr1PsychosocialConsent('nr1-consent-user')).resolves.toBe(false);

    const answerBlocked = await patchAnswer('nr1-consent-user');
    expect(answerBlocked.status).toBe(403);
    await expect(answerBlocked.json()).resolves.toMatchObject({
      error: 'Consentimento NR-1 pendente ou revogado',
    });

    const submitBlocked = await putSubmit('nr1-consent-user');
    expect(submitBlocked.status).toBe(403);

    grantNr1Consent('nr1-consent-user');
    await expect(hasActiveNr1PsychosocialConsent('nr1-consent-user')).resolves.toBe(true);

    const answerAllowed = await patchAnswer('nr1-consent-user');
    expect(answerAllowed.status).toBe(204);

    const submitAllowed = await putSubmit('nr1-consent-user');
    expect(submitAllowed.status).toBe(422);
    await expect(submitAllowed.json()).resolves.toMatchObject({ error: 'INCOMPLETE' });
  });

  it('does not allow RH/admin users to render the COPSOQ answer runtime', async () => {
    boundary.authToken = 'valid-token';
    boundary.tokenPayload = {
      userId: 'rh-user',
      companyId: 'company-enabled',
      role: 'rh',
    };

    await expect(getNr1RuntimeEntitlementForCurrentRequest()).resolves.toBe('role_not_allowed');
  });

  it('allows collaborator users to render the COPSOQ answer runtime when NR-1 is enabled', async () => {
    boundary.authToken = 'valid-token';
    boundary.tokenPayload = {
      userId: 'collaborator-user',
      companyId: 'company-enabled',
      role: 'colaboradora',
    };

    await expect(getNr1RuntimeEntitlementForCurrentRequest()).resolves.toBe('enabled');
  });

  it('keeps the route and all COPSOQ endpoints guarded by the canonical entitlement helper', () => {
    const page = read('src/app/(platform)/avaliacao-nr1/page.tsx');
    const entitlementSource = read('src/lib/nr1/runtime-entitlement.ts');
    expect(page).toContain('getNr1RuntimeEntitlementForCurrentRequest');
    expect(page).toContain("redirect('/nr1')");
    expect(page.indexOf('getNr1RuntimeEntitlementForCurrentRequest')).toBeLessThan(page.indexOf('<CopsoqFlow'));
    expect(entitlementSource).toContain("'role_not_allowed'");
    expect(entitlementSource).toContain("payload.role !== 'colaboradora'");
    expect(entitlementSource).toContain("payload.role !== 'lideranca'");

    for (const route of [
      'src/app/api/yavix/copsoq/bootstrap/route.ts',
      'src/app/api/yavix/copsoq/answer/route.ts',
      'src/app/api/yavix/copsoq/consent/route.ts',
      'src/app/api/yavix/copsoq/submit/route.ts',
    ]) {
      const source = read(route);
      expect(source, route).toContain('requireNr1RuntimeEntitlement(auth)');
    }

    for (const route of [
      'src/app/api/yavix/copsoq/answer/route.ts',
      'src/app/api/yavix/copsoq/submit/route.ts',
    ]) {
      const source = read(route);
      expect(source, route).toContain('requireNr1PsychosocialConsent(auth.userId)');
    }
  });
});
