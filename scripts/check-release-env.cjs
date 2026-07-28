#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const env = { ...process.env };
const loadedFiles = [];

function parseEnvFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}

for (const fileName of ['.env.production', '.env.local', '.env']) {
  const filePath = path.join(repoRoot, fileName);
  if (fs.existsSync(filePath)) {
    parseEnvFile(filePath);
    loadedFiles.push(fileName);
  }
}

const checks = [];
function record(id, status, detail) {
  checks.push({ id, status, detail });
}

function isPlaceholder(value) {
  return /(GERAR|CHANGE|CHANGEME|TODO|EXAMPLE|PLACEHOLDER|SEGREDO_FORTE)/i.test(value);
}

function checkSecret(name) {
  const value = env[name];
  if (!value) {
    record(name, 'FAIL', 'missing');
    return;
  }
  if (value.length < 32) {
    record(name, 'FAIL', `too short (${value.length} chars; expected >= 32)`);
    return;
  }
  if (isPlaceholder(value)) {
    record(name, 'FAIL', 'looks like placeholder/example text');
    return;
  }
  record(name, 'PASS', `present (${value.length} chars; value redacted)`);
}

checkSecret('JWT_SECRET');
checkSecret('JWT_REFRESH_SECRET');

if (env.JWT_SECRET && env.JWT_REFRESH_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  record('JWT_SECRET_PAIR', 'FAIL', 'access and refresh secrets must differ');
} else if (env.JWT_SECRET && env.JWT_REFRESH_SECRET) {
  record('JWT_SECRET_PAIR', 'PASS', 'access and refresh secrets differ');
}

let appUrl;
if (!env.NEXT_PUBLIC_APP_URL) {
  record('NEXT_PUBLIC_APP_URL', 'FAIL', 'missing');
} else {
  try {
    appUrl = new URL(env.NEXT_PUBLIC_APP_URL);
    if (!['http:', 'https:'].includes(appUrl.protocol)) {
      record('NEXT_PUBLIC_APP_URL', 'FAIL', `unsupported protocol ${appUrl.protocol}`);
    } else if (appUrl.protocol === 'https:') {
      record('NEXT_PUBLIC_APP_URL', 'PASS', `https URL configured for ${appUrl.hostname}`);
    } else if (env.ALLOW_INSECURE_HTTP_COOKIES === 'true') {
      record('NEXT_PUBLIC_APP_URL', 'HOLD', `http URL configured for ${appUrl.hostname}; allowed only for local/homologation`);
    } else {
      record('NEXT_PUBLIC_APP_URL', 'FAIL', 'http URL without ALLOW_INSECURE_HTTP_COOKIES=true');
    }
  } catch (error) {
    record('NEXT_PUBLIC_APP_URL', 'FAIL', `invalid URL: ${error.message}`);
  }
}

if (appUrl?.protocol === 'https:' && env.ALLOW_INSECURE_HTTP_COOKIES === 'true') {
  record('COOKIE_SECURITY', 'FAIL', 'HTTPS release must not keep ALLOW_INSECURE_HTTP_COOKIES=true');
} else if (appUrl?.protocol === 'http:' && env.ALLOW_INSECURE_HTTP_COOKIES === 'true') {
  record('COOKIE_SECURITY', 'HOLD', 'insecure cookies are acceptable only for local/homologation HTTP');
} else if (appUrl) {
  record('COOKIE_SECURITY', 'PASS', 'cookie posture matches configured app URL scheme');
}

const tokenBlacklistBackend = (env.ACCESS_TOKEN_BLACKLIST_BACKEND || 'memory').toLowerCase();
const releaseLikeRuntime = env.NODE_ENV === 'production' || appUrl?.protocol === 'https:';
if (tokenBlacklistBackend === 'memory') {
  if (releaseLikeRuntime) {
    record(
      'ACCESS_TOKEN_BLACKLIST',
      'FAIL',
      'in-memory access token blacklist is not shared or persistent; production requires a real revocation backend',
    );
  } else {
    record(
      'ACCESS_TOKEN_BLACKLIST',
      'HOLD',
      'in-memory access token blacklist is acceptable only for local/homologation',
    );
  }
} else if (tokenBlacklistBackend === 'sqlite') {
  if (!env.DATABASE_PATH) {
    record('ACCESS_TOKEN_BLACKLIST', 'FAIL', 'sqlite backend requires DATABASE_PATH');
  } else {
    const dbPath = path.resolve(repoRoot, env.DATABASE_PATH);
    if (!fs.existsSync(dbPath)) {
      record('ACCESS_TOKEN_BLACKLIST', 'HOLD', `sqlite backend declared; database file not present yet: ${dbPath}`);
    } else {
      try {
        const Database = require('better-sqlite3');
        const db = new Database(dbPath, { readonly: true, fileMustExist: true });
        try {
          const table = db.prepare(`
            SELECT 1 AS exists_flag
            FROM sqlite_master
            WHERE type = 'table' AND name = 'access_token_blacklist'
            LIMIT 1
          `).get();
          if (table) {
            record('ACCESS_TOKEN_BLACKLIST', 'PASS', 'sqlite access token blacklist table is present');
          } else {
            record('ACCESS_TOKEN_BLACKLIST', 'FAIL', 'sqlite backend declared but access_token_blacklist table is missing; run migrations');
          }
        } finally {
          db.close();
        }
      } catch (error) {
        record('ACCESS_TOKEN_BLACKLIST', 'HOLD', `cannot inspect sqlite blacklist backend: ${error.message}`);
      }
    }
  }
} else {
  record(
    'ACCESS_TOKEN_BLACKLIST',
    'FAIL',
    `${tokenBlacklistBackend} backend is not supported; use memory for local/homologation or sqlite for production`,
  );
}

if (!env.DATABASE_PATH) {
  record('DATABASE_PATH', 'FAIL', 'missing');
} else {
  const dbPath = path.resolve(repoRoot, env.DATABASE_PATH);
  const parentDir = path.dirname(dbPath);
  if (!fs.existsSync(parentDir)) {
    record('DATABASE_PATH', 'FAIL', `parent directory does not exist: ${parentDir}`);
  } else if (!fs.existsSync(dbPath)) {
    record('DATABASE_PATH', 'HOLD', `database file not present yet: ${dbPath}`);
  } else {
    record('DATABASE_PATH', 'PASS', `database file exists (${fs.statSync(dbPath).size} bytes)`);
    checkDemoAccounts(dbPath);
  }
}

function checkDemoAccounts(dbPath) {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    record('DEMO_ACCOUNTS', 'HOLD', `cannot inspect database; better-sqlite3 unavailable: ${error.message}`);
    return;
  }

  const expectedEmails = [
    'admin@uniher.com.br',
    'rh.visual@eduardaeyurimarketingltda.com.br',
    'lideranca.visual@eduardaeyurimarketingltda.com.br',
    'nr1.visual@eduardaeyurimarketingltda.com.br',
  ];

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
    if (!usersTable) {
      record('DEMO_ACCOUNTS', 'FAIL', 'users table not found');
      return;
    }

    const rows = db.prepare(`
      SELECT email, role, approved, deleted_at, must_change_password
      FROM users
      WHERE email IN (${expectedEmails.map(() => '?').join(', ')})
      ORDER BY email
    `).all(...expectedEmails);
    const found = new Set(rows.map((row) => row.email));
    const missing = expectedEmails.filter((email) => !found.has(email));
    if (missing.length > 0) {
      record('DEMO_ACCOUNTS', 'HOLD', `missing demo accounts in configured DB: ${missing.join(', ')}`);
      return;
    }

    const blocked = rows.filter((row) => row.deleted_at || row.approved === 0 || row.must_change_password === 1);
    if (blocked.length > 0) {
      record('DEMO_ACCOUNTS', 'FAIL', `demo accounts not login-ready: ${blocked.map((row) => row.email).join(', ')}`);
      return;
    }

    record('DEMO_ACCOUNTS', 'PASS', 'admin, RH visual, Leadership visual and NR-1 collaborator demo accounts are present and login-ready');
  } finally {
    db.close();
  }
}

console.log('# UniHER release environment preflight');
console.log(`Loaded env files: ${loadedFiles.length > 0 ? loadedFiles.join(', ') : '(none)'}`);
for (const check of checks) {
  console.log(`${check.status.padEnd(4)} ${check.id}: ${check.detail}`);
}

const failCount = checks.filter((check) => check.status === 'FAIL').length;
const holdCount = checks.filter((check) => check.status === 'HOLD').length;
console.log(`Summary: PASS ${checks.filter((check) => check.status === 'PASS').length}, HOLD ${holdCount}, FAIL ${failCount}`);

if (failCount > 0) process.exit(1);
if (holdCount > 0) process.exitCode = 2;
