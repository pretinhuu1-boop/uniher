import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');
const apiRoot = path.join(projectRoot, 'src', 'app', 'api');
const baseUrl = (process.env.SECURITY_AUDIT_BASE_URL ?? 'http://127.0.0.1:3000')
  .replace(/\/+$/, '');
const outputPath = process.env.SECURITY_AUDIT_OUTPUT
  ? path.resolve(process.env.SECURITY_AUDIT_OUTPUT)
  : path.join(projectRoot, 'artifacts', 'security', 'public-api-readonly-audit.json');

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

const failures = results.filter((result) => result.verdict.startsWith('FAIL_'));
const report = {
  generatedAt: new Date().toISOString(),
  mode: 'readonly-anonymous-get',
  baseUrl,
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
