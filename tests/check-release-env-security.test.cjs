const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const repoRoot = path.resolve(__dirname, '..');

test('release env fails production while access token blacklist is in-memory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-release-env-'));
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'access-secret-at-least-32-characters-for-test',
    JWT_REFRESH_SECRET: 'refresh-secret-at-least-32-characters-for-test',
    NEXT_PUBLIC_APP_URL: 'https://uniher.example.test',
    DATABASE_PATH: path.join(tempDir, 'missing-demo.db'),
  };
  delete env.ALLOW_INSECURE_HTTP_COOKIES;
  delete env.ACCESS_TOKEN_BLACKLIST_BACKEND;

  const result = spawnSync(process.execPath, ['scripts/check-release-env.cjs'], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.match(output, /FAIL\s+ACCESS_TOKEN_BLACKLIST:/);
  assert.match(output, /in-memory access token blacklist/i);
  assert.equal(result.status, 1);
});

test('release env fails production without configured operational smoke accounts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-release-env-'));
  const dbPath = path.join(tempDir, 'release.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE access_token_blacklist (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      created_at TEXT
    );
    CREATE TABLE users (
      email TEXT PRIMARY KEY,
      role TEXT,
      approved INTEGER,
      deleted_at TEXT,
      must_change_password INTEGER
    );
  `);
  db.close();

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'access-secret-at-least-32-characters-for-test',
    JWT_REFRESH_SECRET: 'refresh-secret-at-least-32-characters-for-test',
    NEXT_PUBLIC_APP_URL: 'https://uniher.example.test',
    DATABASE_PATH: dbPath,
    ACCESS_TOKEN_BLACKLIST_BACKEND: 'sqlite',
    UNIHER_RELEASE_SMOKE_ACCOUNTS: '',
  };
  delete env.ALLOW_INSECURE_HTTP_COOKIES;

  const result = spawnSync(process.execPath, ['scripts/check-release-env.cjs'], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.match(output, /FAIL\s+SMOKE_ACCOUNTS:/);
  assert.match(output, /UNIHER_RELEASE_SMOKE_ACCOUNTS/);
  assert.equal(result.status, 1);
});

test('release env accepts sqlite access token blacklist with configured login-ready smoke accounts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uniher-release-env-'));
  const dbPath = path.join(tempDir, 'release.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE access_token_blacklist (
      token_hash TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      created_at TEXT
    );
    CREATE TABLE users (
      email TEXT PRIMARY KEY,
      role TEXT,
      approved INTEGER,
      deleted_at TEXT,
      must_change_password INTEGER
    );
    INSERT INTO users (email, role, approved, deleted_at, must_change_password) VALUES
      ('admin@uniher.com.br', 'admin', 1, NULL, 0),
      ('rh.visual@eduardaeyurimarketingltda.com.br', 'rh', 1, NULL, 0),
      ('lideranca.visual@eduardaeyurimarketingltda.com.br', 'lideranca', 1, NULL, 0),
      ('nr1.visual@eduardaeyurimarketingltda.com.br', 'colaboradora', 1, NULL, 0);
  `);
  db.close();

  const env = {
    ...process.env,
    NODE_ENV: 'production',
    JWT_SECRET: 'access-secret-at-least-32-characters-for-test',
    JWT_REFRESH_SECRET: 'refresh-secret-at-least-32-characters-for-test',
    NEXT_PUBLIC_APP_URL: 'https://uniher.example.test',
    DATABASE_PATH: dbPath,
    ACCESS_TOKEN_BLACKLIST_BACKEND: 'sqlite',
    UNIHER_RELEASE_SMOKE_ACCOUNTS:
      'admin@uniher.com.br:admin,rh.visual@eduardaeyurimarketingltda.com.br:rh,lideranca.visual@eduardaeyurimarketingltda.com.br:lideranca,nr1.visual@eduardaeyurimarketingltda.com.br:colaboradora',
  };
  delete env.ALLOW_INSECURE_HTTP_COOKIES;

  const result = spawnSync(process.execPath, ['scripts/check-release-env.cjs'], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
  const output = `${result.stdout}\n${result.stderr}`;

  assert.match(output, /PASS\s+ACCESS_TOKEN_BLACKLIST:/);
  assert.match(output, /PASS\s+SMOKE_ACCOUNTS:/);
  assert.equal(result.status, 0);
});
