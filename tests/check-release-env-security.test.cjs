const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

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
