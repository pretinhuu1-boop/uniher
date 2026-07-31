import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');
const apiRoot = path.join(projectRoot, 'src', 'app', 'api');
const baseUrl = (process.env.SECURITY_AUDIT_BASE_URL ?? 'http://127.0.0.1:3000')
  .replace(/\/+$/, '');
const allowIsolatedMethodProbes = process.env.SECURITY_AUDIT_ALLOW_WRITES === '1';
const isolatedDatabasePath = process.env.SECURITY_AUDIT_DATABASE_PATH
  ? path.resolve(process.env.SECURITY_AUDIT_DATABASE_PATH)
  : null;
const outputPath = process.env.SECURITY_AUDIT_OUTPUT
  ? path.resolve(process.env.SECURITY_AUDIT_OUTPUT)
  : path.join(projectRoot, 'artifacts', 'security', 'public-api-readonly-audit.json');

const ISOLATED_METHOD_PROBES = [
  {
    id: 'register-role-escalation',
    method: 'POST',
    path: '/api/auth/register',
    expectedStatuses: [400],
    body: {
      name: 'Security Probe',
      email: 'security-probe-register@example.invalid',
      password: 'Security@2026',
      role: 'admin',
      companyId: 'security-probe-company',
    },
  },
  {
    id: 'fake-invite-token',
    method: 'POST',
    path: '/api/invites/security-probe-invalid-token',
    expectedStatuses: [404],
    body: {
      name: 'Security Probe',
      password: 'Security@2026',
    },
  },
  {
    id: 'lead-without-consent',
    method: 'POST',
    path: '/api/leads',
    expectedStatuses: [400],
    body: {
      name: 'Security Probe',
      email: 'security-probe-lead@example.invalid',
      consent: false,
      source: 'security-audit',
    },
  },
  {
    id: 'forgot-password-invalid-email',
    method: 'POST',
    path: '/api/auth/forgot-password',
    expectedStatuses: [422],
    body: {
      email: 'not-an-email',
    },
  },
  {
    id: 'reset-password-invalid-token',
    method: 'POST',
    path: '/api/auth/reset-password',
    expectedStatuses: [400],
    body: {
      token: 'security-probe-invalid-token',
      password: 'Security@2026',
    },
  },
  {
    id: 'login-invalid-credentials',
    method: 'POST',
    path: '/api/auth/login',
    expectedStatuses: [401],
    body: {
      email: 'security-probe-login@example.com',
      password: 'Wrong@2026',
    },
  },
  {
    id: 'refresh-without-cookie',
    method: 'POST',
    path: '/api/auth/refresh',
    expectedStatuses: [401],
  },
  {
    id: 'anonymous-logout',
    method: 'POST',
    path: '/api/auth/logout',
    expectedStatuses: [200],
    validate(body) {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      return keys.length === 1 && keys[0] === 'success' && body.success === true;
    },
  },
  {
    id: 'approve-invite-without-auth',
    method: 'PATCH',
    path: '/api/invites/approve',
    expectedStatuses: [401],
    body: {
      userId: 'security-probe-user',
      action: 'approve',
    },
  },
  {
    id: 'delete-fake-invite-without-auth',
    method: 'DELETE',
    path: '/api/invites/security-probe-invalid-token',
    expectedStatuses: [401],
  },
];

const PUBLIC_GET_RULES = new Map([
  ['/api/health', {
    statuses: [200, 503],
    validate(body) {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      return keys.length === 1
        && keys[0] === 'status'
        && ['healthy', 'degraded'].includes(body.status);
    },
  }],
  ['/api/push/vapid-key', {
    statuses: [200],
    validate(body) {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      const disabled = keys.length === 1
        && keys[0] === 'enabled'
        && body.enabled === false;
      const enabled = keys.length === 2
        && keys.includes('enabled')
        && keys.includes('publicKey')
        && body.enabled === true
        && typeof body.publicKey === 'string';
      return disabled || enabled;
    },
  }],
]);

const SENSITIVE_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'email',
  'phone',
  'contactPhone',
  'contactEmail',
  'cnpj',
  'notes',
  'userId',
  'companyId',
  'users',
  'companies',
  'db',
  'memory',
]);

const DOMAIN_TABLES = [
  'companies',
  'users',
  'invites',
  'leads',
  'password_reset_tokens',
  'refresh_tokens',
];

function listRouteFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listRouteFiles(entryPath);
    return entry.isFile() && entry.name === 'route.ts' ? [entryPath] : [];
  });
}

function exportsGet(source) {
  return /export\s+(?:async\s+)?function\s+GET\b|export\s+const\s+GET\b/.test(source);
}

function routeTemplate(filePath) {
  const relativeDir = path.relative(apiRoot, path.dirname(filePath));
  const suffix = relativeDir ? `/${relativeDir.split(path.sep).join('/')}` : '';
  return `/api${suffix}`;
}

function probePath(template) {
  return template
    .replace(/\[\[\.\.\.[^\]]+\]\]/g, 'security-probe')
    .replace(/\[\.\.\.[^\]]+\]/g, 'security-probe')
    .replace(/\[[^\]]+\]/g, 'security-probe');
}

function collectSensitiveKeys(value, found = new Set()) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    for (const item of value) collectSensitiveKeys(item, found);
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) found.add(key);
    collectSensitiveKeys(child, found);
  }
  return found;
}

function assertSensitiveKeyClassifier() {
  const messageKeys = collectSensitiveKeys({
    error: 'Token invalido ou expirado',
  });
  const explicitKeys = collectSensitiveKeys({
    token: 'security-probe-token',
  });
  if (messageKeys.size !== 0 || !explicitKeys.has('token')) {
    throw new Error('Sensitive response classifier must inspect keys, not message values');
  }
}

function readDomainCounts(databasePath) {
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return Object.fromEntries(DOMAIN_TABLES.map((table) => [
      table,
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
    ]));
  } finally {
    db.close();
  }
}

async function readResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  const text = (await response.text()).slice(0, 65_536);
  if (!contentType.includes('application/json')) {
    return { body: null, preview: text.slice(0, 300) };
  }
  try {
    return { body: JSON.parse(text), preview: text.slice(0, 300) };
  } catch {
    return { body: null, preview: text.slice(0, 300) };
  }
}

function classify(route, status, body) {
  const publicRule = PUBLIC_GET_RULES.get(route.template);
  if (publicRule) {
    const validStatus = publicRule.statuses.includes(status);
    const validBody = publicRule.validate(body);
    return {
      verdict: validStatus && validBody ? 'PASS_PUBLIC_MINIMAL' : 'FAIL_PUBLIC_CONTRACT',
      exposedKeys: [...collectSensitiveKeys(body)],
    };
  }

  const exposedKeys = [...collectSensitiveKeys(body)];
  if (status >= 200 && status < 300) {
    return { verdict: 'FAIL_UNEXPECTED_PUBLIC_2XX', exposedKeys };
  }
  if (exposedKeys.length > 0) {
    return { verdict: 'FAIL_SENSITIVE_ERROR_BODY', exposedKeys };
  }
  if (status >= 500) {
    return { verdict: 'FAIL_SERVER_ERROR', exposedKeys };
  }
  if ([401, 403, 404, 405, 410].includes(status)) {
    return { verdict: 'PASS_PROTECTED', exposedKeys };
  }
  return { verdict: 'FAIL_AMBIGUOUS_PROTECTION', exposedKeys };
}

async function probe(route) {
  const url = `${baseUrl}${route.path}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UniHER-Readonly-Security-Audit/1.0',
      },
    });
    const { body, preview } = await readResponse(response);
    return {
      ...route,
      method: 'GET',
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      ...classify(route, response.status, body),
      preview,
    };
  } catch (error) {
    return {
      ...route,
      method: 'GET',
      url,
      status: null,
      contentType: null,
      verdict: 'FAIL_REQUEST_ERROR',
      exposedKeys: [],
      preview: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeIsolatedMethod(probeDefinition) {
  const url = `${baseUrl}${probeDefinition.path}`;
  try {
    const headers = {
      Accept: 'application/json',
      'User-Agent': 'UniHER-Isolated-Method-Security-Audit/1.0',
    };
    if (probeDefinition.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, {
      method: probeDefinition.method,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers,
      body: probeDefinition.body === undefined
        ? undefined
        : JSON.stringify(probeDefinition.body),
    });
    const { body, preview } = await readResponse(response);
    const exposedKeys = [...collectSensitiveKeys(body)];
    const validStatus = probeDefinition.expectedStatuses.includes(response.status);
    const validBody = probeDefinition.validate
      ? probeDefinition.validate(body)
      : true;
    return {
      id: probeDefinition.id,
      template: probeDefinition.path,
      path: probeDefinition.path,
      method: probeDefinition.method,
      url,
      status: response.status,
      expectedStatuses: probeDefinition.expectedStatuses,
      contentType: response.headers.get('content-type'),
      verdict: validStatus && validBody && exposedKeys.length === 0
        ? 'PASS_ISOLATED_METHOD_CONTRACT'
        : 'FAIL_ISOLATED_METHOD_CONTRACT',
      exposedKeys,
      preview,
    };
  } catch (error) {
    return {
      id: probeDefinition.id,
      template: probeDefinition.path,
      path: probeDefinition.path,
      method: probeDefinition.method,
      url,
      status: null,
      expectedStatuses: probeDefinition.expectedStatuses,
      contentType: null,
      verdict: 'FAIL_REQUEST_ERROR',
      exposedKeys: [],
      preview: error instanceof Error ? error.message : String(error),
    };
  }
}

assertSensitiveKeyClassifier();

let domainCountsBefore = null;
if (allowIsolatedMethodProbes) {
  const target = new URL(baseUrl);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  if (!loopbackHosts.has(target.hostname)) {
    throw new Error(
      'SECURITY_AUDIT_ALLOW_WRITES=1 is restricted to a loopback isolated runtime',
    );
  }
  if (!isolatedDatabasePath) {
    throw new Error(
      'SECURITY_AUDIT_DATABASE_PATH is required for isolated persistence verification',
    );
  }
  domainCountsBefore = readDomainCounts(isolatedDatabasePath);
}

const routes = listRouteFiles(apiRoot)
  .filter((filePath) => exportsGet(fs.readFileSync(filePath, 'utf8')))
  .map((filePath) => {
    const template = routeTemplate(filePath);
    return {
      template,
      path: probePath(template),
      source: path.relative(projectRoot, filePath).split(path.sep).join('/'),
    };
  })
  .sort((a, b) => a.template.localeCompare(b.template));

const results = [];
for (const route of routes) {
  results.push(await probe(route));
}
if (allowIsolatedMethodProbes) {
  for (const probeDefinition of ISOLATED_METHOD_PROBES) {
    results.push(await probeIsolatedMethod(probeDefinition));
  }
}

const domainCountsAfter = allowIsolatedMethodProbes
  ? readDomainCounts(isolatedDatabasePath)
  : null;
const domainPersistenceDrift = allowIsolatedMethodProbes
  ? Object.fromEntries(DOMAIN_TABLES
    .filter((table) => domainCountsBefore[table] !== domainCountsAfter[table])
    .map((table) => [table, {
      before: domainCountsBefore[table],
      after: domainCountsAfter[table],
    }]))
  : {};
if (Object.keys(domainPersistenceDrift).length > 0) {
  results.push({
    id: 'domain-persistence-invariant',
    template: 'isolated-database',
    path: isolatedDatabasePath,
    method: 'DATABASE',
    url: null,
    status: null,
    expectedStatuses: [],
    contentType: null,
    verdict: 'FAIL_DOMAIN_PERSISTENCE',
    exposedKeys: [],
    preview: JSON.stringify(domainPersistenceDrift),
  });
}

const failures = results.filter((result) => result.verdict.startsWith('FAIL_'));
const report = {
  generatedAt: new Date().toISOString(),
  mode: allowIsolatedMethodProbes
    ? 'readonly-anonymous-get+isolated-method-contracts'
    : 'readonly-anonymous-get',
  baseUrl,
  isolatedMethodProbesEnabled: allowIsolatedMethodProbes,
  isolatedMethodProbeCount: allowIsolatedMethodProbes ? ISOLATED_METHOD_PROBES.length : 0,
  sensitiveClassifierSelfCheck: 'keys-only-pass',
  domainCountsBefore,
  domainCountsAfter,
  domainPersistenceDrift,
  telemetryPersistenceNote: allowIsolatedMethodProbes
    ? 'invalid login may append an audit_logs security receipt'
    : null,
  persistenceGuard: allowIsolatedMethodProbes
    ? 'loopback-only with automatic domain-table count invariant'
    : 'no state-changing methods executed',
  routeCount: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  failures,
  results,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  mode: report.mode,
  baseUrl: report.baseUrl,
  routeCount: report.routeCount,
  passed: report.passed,
  failed: report.failed,
  outputPath,
}, null, 2));

for (const failure of failures) {
  console.error(`${failure.verdict} ${failure.status ?? 'ERR'} ${failure.template}`);
}

process.exitCode = failures.length === 0 ? 0 : 1;
