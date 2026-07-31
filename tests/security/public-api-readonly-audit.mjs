import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
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
const configuredIsolatedDatabasePath = process.env.SECURITY_AUDIT_DATABASE_PATH ?? null;
const outputPath = process.env.SECURITY_AUDIT_OUTPUT
  ? path.resolve(process.env.SECURITY_AUDIT_OUTPUT)
  : path.join(projectRoot, 'artifacts', 'security', 'public-api-readonly-audit.json');
const defaultDatabasePath = path.join(projectRoot, 'data', 'uniher.db');
const methodProbeRunId = randomUUID();
const dynamicProbeSegment = `security-probe-${methodProbeRunId}`;
const databaseBindingProbeEmail = `security-probe-${methodProbeRunId}@example.invalid`;

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
      email: databaseBindingProbeEmail,
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
  ['/api/invites/[token]', {
    statuses: [404],
    validate(body) {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      return keys.length === 1
        && keys[0] === 'error'
        && typeof body.error === 'string';
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
    .replace(/\[\[\.\.\.[^\]]+\]\]/g, dynamicProbeSegment)
    .replace(/\[\.\.\.[^\]]+\]/g, dynamicProbeSegment)
    .replace(/\[[^\]]+\]/g, dynamicProbeSegment);
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

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readDatabaseSnapshot(databasePath) {
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    db.exec('BEGIN');
    const definitions = db.prepare(`
      SELECT name, sql
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    const schemaHash = createHash('sha256');
    const contentHash = createHash('sha256');
    const tables = {};

    for (const definition of definitions) {
      schemaHash.update(`${definition.name}\0${definition.sql ?? ''}\0`);
      const tableHash = createHash('sha256');
      const rows = db.prepare(
        `SELECT * FROM ${quoteIdentifier(definition.name)} ORDER BY rowid`,
      ).all();
      for (const row of rows) {
        tableHash.update(JSON.stringify(row));
        tableHash.update('\n');
      }
      const tableDigest = tableHash.digest('hex');
      tables[definition.name] = {
        rowCount: rows.length,
        contentSha256: tableDigest,
      };
      contentHash.update(`${definition.name}\0${rows.length}\0${tableDigest}\0`);
    }

    const snapshot = {
      schemaSha256: schemaHash.digest('hex'),
      contentSha256: contentHash.digest('hex'),
      tables,
    };
    db.exec('COMMIT');
    return snapshot;
  } catch (error) {
    if (db.inTransaction) db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

function resolveIsolatedDatabase() {
  const target = new URL(baseUrl);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  if (!loopbackHosts.has(target.hostname)) {
    throw new Error(
      'SECURITY_AUDIT_ALLOW_WRITES=1 is restricted to a loopback isolated runtime',
    );
  }
  if (!configuredIsolatedDatabasePath) {
    throw new Error(
      'SECURITY_AUDIT_DATABASE_PATH is required for isolated persistence verification',
    );
  }
  if (!path.isAbsolute(configuredIsolatedDatabasePath)) {
    throw new Error(
      'SECURITY_AUDIT_DATABASE_PATH must be absolute to bind method evidence unambiguously',
    );
  }

  const realPath = fs.realpathSync.native(configuredIsolatedDatabasePath);
  const defaultRealPath = fs.existsSync(defaultDatabasePath)
    ? fs.realpathSync.native(defaultDatabasePath)
    : path.resolve(defaultDatabasePath);
  if (realPath.toLowerCase() === defaultRealPath.toLowerCase()) {
    throw new Error('Isolated method probes refuse the default data/uniher.db database');
  }

  const stat = fs.statSync(realPath);
  if (!stat.isFile()) {
    throw new Error('SECURITY_AUDIT_DATABASE_PATH must resolve to a database file');
  }
  return {
    configuredPath: configuredIsolatedDatabasePath,
    realPath,
    sizeBytesBefore: stat.size,
  };
}

function readBindingReceipts(databasePath) {
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const db = new Database(databasePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    return db.prepare(`
      SELECT actor_id, actor_email, actor_role, action, entity_type, details
      FROM audit_logs
      WHERE actor_email = ? AND action = 'login_failed'
      ORDER BY rowid
    `).all(databaseBindingProbeEmail);
  } finally {
    db.close();
  }
}

async function waitForBindingReceipt(databasePath) {
  const deadline = Date.now() + 5_000;
  let receipts = [];
  do {
    receipts = readBindingReceipts(databasePath);
    if (receipts.length > 0) return receipts;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  return receipts;
}

function compareDatabaseSnapshots(before, after, receipts) {
  const tableNames = new Set([
    ...Object.keys(before.tables),
    ...Object.keys(after.tables),
  ]);
  const unexpectedTableDrift = {};
  for (const tableName of [...tableNames].sort()) {
    if (tableName === 'audit_logs') continue;
    const beforeTable = before.tables[tableName] ?? null;
    const afterTable = after.tables[tableName] ?? null;
    if (JSON.stringify(beforeTable) !== JSON.stringify(afterTable)) {
      unexpectedTableDrift[tableName] = { before: beforeTable, after: afterTable };
    }
  }

  const auditBefore = before.tables.audit_logs ?? null;
  const auditAfter = after.tables.audit_logs ?? null;
  const auditLogDelta = auditBefore && auditAfter
    ? auditAfter.rowCount - auditBefore.rowCount
    : null;
  const parsedReceipts = receipts.map((receipt) => {
    let details = null;
    try {
      details = JSON.parse(receipt.details);
    } catch {
      details = null;
    }
    return {
      actorId: receipt.actor_id,
      actorRole: receipt.actor_role,
      action: receipt.action,
      entityType: receipt.entity_type,
      reason: details?.reason ?? null,
    };
  });
  const validBindingReceipt = parsedReceipts.length === 1
    && parsedReceipts[0].actorId === 'anonymous'
    && parsedReceipts[0].actorRole === 'unknown'
    && parsedReceipts[0].action === 'login_failed'
    && parsedReceipts[0].entityType === 'auth'
    && parsedReceipts[0].reason === 'User not found';
  const schemaUnchanged = before.schemaSha256 === after.schemaSha256;
  const contentInvariantPassed = schemaUnchanged
    && Object.keys(unexpectedTableDrift).length === 0
    && auditLogDelta === 1
    && validBindingReceipt;

  return {
    verdict: contentInvariantPassed
      ? 'PASS_ISOLATED_DATABASE_BOUND_AND_INVARIANT'
      : 'FAIL_ISOLATED_DATABASE_BINDING_OR_CONTENT_DRIFT',
    schemaUnchanged,
    nonAuditTablesUnchanged: Object.keys(unexpectedTableDrift).length === 0,
    unexpectedTableDrift,
    auditLogDelta,
    bindingReceipt: {
      probeEmailSha256: sha256(databaseBindingProbeEmail),
      observedCount: parsedReceipts.length,
      expected: 'exactly one anonymous login_failed/User not found receipt',
      observed: parsedReceipts,
    },
  };
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
  if ([401, 403].includes(status)) {
    return { verdict: 'PASS_PROTECTED', exposedKeys };
  }
  return { verdict: 'FAIL_PRIVATE_AUTH_STATUS', exposedKeys };
}

function assertPrivateGetClassifier() {
  const privateRoute = { template: '/api/private-resource/[id]' };
  const unauthorized = classify(privateRoute, 401, { error: 'Nao autenticado' });
  const forbidden = classify(privateRoute, 403, { error: 'Sem permissao' });
  const missingFakeId = classify(privateRoute, 404, { error: 'Nao encontrado' });
  const knownPublicMissingToken = classify(
    { template: '/api/invites/[token]' },
    404,
    { error: 'Convite invalido' },
  );
  if (unauthorized.verdict !== 'PASS_PROTECTED'
    || forbidden.verdict !== 'PASS_PROTECTED'
    || missingFakeId.verdict !== 'FAIL_PRIVATE_AUTH_STATUS'
    || knownPublicMissingToken.verdict !== 'PASS_PUBLIC_MINIMAL') {
    throw new Error('GET classifier must require 401/403 except for explicit public contracts');
  }
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
assertPrivateGetClassifier();

const isolatedDatabase = allowIsolatedMethodProbes
  ? resolveIsolatedDatabase()
  : null;

const routes = listRouteFiles(apiRoot)
  .filter((filePath) => exportsGet(fs.readFileSync(filePath, 'utf8')))
  .map((filePath) => {
    const template = routeTemplate(filePath);
    return {
      template,
      path: probePath(template),
      source: path.relative(projectRoot, filePath).split(path.sep).join('/'),
      accessExpectation: PUBLIC_GET_RULES.has(template)
        ? 'known-public-contract'
        : 'private-requires-401-or-403',
    };
  })
  .sort((a, b) => a.template.localeCompare(b.template));

const readonlyGetResults = [];
for (const route of routes) {
  readonlyGetResults.push(await probe(route));
}

const databaseSnapshotBefore = isolatedDatabase
  ? readDatabaseSnapshot(isolatedDatabase.realPath)
  : null;
if (databaseSnapshotBefore && !databaseSnapshotBefore.tables.audit_logs) {
  throw new Error('Isolated database must contain audit_logs for runtime binding evidence');
}

const isolatedMethodResults = [];
if (allowIsolatedMethodProbes) {
  for (const probeDefinition of ISOLATED_METHOD_PROBES) {
    isolatedMethodResults.push(await probeIsolatedMethod(probeDefinition));
  }
}

const bindingReceipts = isolatedDatabase
  ? await waitForBindingReceipt(isolatedDatabase.realPath)
  : [];
const databaseSnapshotAfter = isolatedDatabase
  ? readDatabaseSnapshot(isolatedDatabase.realPath)
  : null;
const databaseInvariant = databaseSnapshotBefore && databaseSnapshotAfter
  ? compareDatabaseSnapshots(databaseSnapshotBefore, databaseSnapshotAfter, bindingReceipts)
  : null;

const readonlyGetFailures = readonlyGetResults
  .filter((result) => result.verdict.startsWith('FAIL_'));
const isolatedMethodFailures = isolatedMethodResults
  .filter((result) => result.verdict.startsWith('FAIL_'));
const databaseInvariantFailed = databaseInvariant?.verdict.startsWith('FAIL_') ?? false;
const isolatedMethodFailureCount = isolatedMethodFailures.length
  + (databaseInvariantFailed ? 1 : 0);
const totalFailed = readonlyGetFailures.length + isolatedMethodFailureCount;
const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  baseUrl,
  classifierSelfChecks: [
    'sensitive-response-keys-only',
    'private-get-requires-401-or-403',
    'known-public-get-contracts-only',
  ],
  readonlyGetEvidence: {
    evidenceKind: 'anonymous-get-only',
    executionPolicy: 'GET requests only; no state-changing methods in this evidence set',
    knownPublicTemplates: [...PUBLIC_GET_RULES.keys()].sort(),
    privateAcceptedStatuses: [401, 403],
    routeCount: readonlyGetResults.length,
    passed: readonlyGetResults.length - readonlyGetFailures.length,
    failed: readonlyGetFailures.length,
    failures: readonlyGetFailures,
    results: readonlyGetResults,
  },
  isolatedMethodEvidence: {
    evidenceKind: 'loopback-isolated-database-method-contracts',
    enabled: allowIsolatedMethodProbes,
    executionPolicy: allowIsolatedMethodProbes
      ? 'POST/PATCH/DELETE probes permitted only on loopback with a non-default absolute SQLite path'
      : 'not executed; SECURITY_AUDIT_ALLOW_WRITES was not 1',
    methodProbeRunId: allowIsolatedMethodProbes ? methodProbeRunId : null,
    probeCount: isolatedMethodResults.length,
    probePassed: isolatedMethodResults.length - isolatedMethodFailures.length,
    probeFailed: isolatedMethodFailures.length,
    evidenceFailureCount: isolatedMethodFailureCount,
    failures: isolatedMethodFailures,
    results: isolatedMethodResults,
    database: isolatedDatabase ? {
      configuredPath: isolatedDatabase.configuredPath,
      realPath: isolatedDatabase.realPath,
      defaultDatabaseRejected: true,
      snapshotKind: 'all-user-tables-row-count-and-content-sha256',
      sizeBytesBefore: isolatedDatabase.sizeBytesBefore,
      sizeBytesAfter: fs.statSync(isolatedDatabase.realPath).size,
      snapshotBefore: databaseSnapshotBefore,
      snapshotAfter: databaseSnapshotAfter,
      invariant: databaseInvariant,
    } : null,
  },
  totalFailed,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  baseUrl: report.baseUrl,
  readonlyGet: {
    routeCount: report.readonlyGetEvidence.routeCount,
    passed: report.readonlyGetEvidence.passed,
    failed: report.readonlyGetEvidence.failed,
  },
  isolatedMethods: {
    enabled: report.isolatedMethodEvidence.enabled,
    probeCount: report.isolatedMethodEvidence.probeCount,
    probePassed: report.isolatedMethodEvidence.probePassed,
    probeFailed: report.isolatedMethodEvidence.probeFailed,
    evidenceFailureCount: report.isolatedMethodEvidence.evidenceFailureCount,
    databaseInvariant: report.isolatedMethodEvidence.database?.invariant.verdict ?? 'NOT_RUN',
  },
  totalFailed: report.totalFailed,
  outputPath,
}, null, 2));

for (const failure of readonlyGetFailures) {
  console.error(`GET ${failure.verdict} ${failure.status ?? 'ERR'} ${failure.template}`);
}
for (const failure of isolatedMethodFailures) {
  console.error(`${failure.verdict} ${failure.status ?? 'ERR'} ${failure.template}`);
}
if (databaseInvariantFailed) {
  console.error(`${databaseInvariant.verdict} ${isolatedDatabase.realPath}`);
}

process.exitCode = totalFailed === 0 ? 0 : 1;
