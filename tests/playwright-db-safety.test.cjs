const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const helperPath = path.join(__dirname, 'playwright-db-safety.cjs');
const safety = fs.existsSync(helperPath) ? require(helperPath) : {};

function requireApi(name) {
  assert.equal(typeof safety[name], 'function', `${name} must be exported`);
  return safety[name];
}

test('ignores a hostile inherited DATABASE_PATH and preserves explicit JWT secrets', () => {
  const createEnvironment = requireApi('createPlaywrightTestEnvironment');
  const environment = createEnvironment({
    DATABASE_PATH: path.resolve(__dirname, '..', 'data', 'production.db'),
    JWT_SECRET: 'real-access-secret-that-must-not-be-overridden',
    JWT_REFRESH_SECRET: 'real-refresh-secret-that-must-not-be-overridden',
  });

  assert.equal(environment.PLAYWRIGHT_TEST, '1');
  assert.equal(environment.DATABASE_PATH, safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH);
  assert.equal(environment.JWT_SECRET, 'real-access-secret-that-must-not-be-overridden');
  assert.equal(environment.JWT_REFRESH_SECRET, 'real-refresh-secret-that-must-not-be-overridden');
  assert.equal(fs.existsSync(path.dirname(environment.DATABASE_PATH)), true);
});

test('rejects PLAYWRIGHT_DATABASE_PATH outside the canonical test-owned root', () => {
  const createEnvironment = requireApi('createPlaywrightTestEnvironment');

  assert.throws(
    () => createEnvironment({
      PLAYWRIGHT_DATABASE_PATH: path.resolve(__dirname, '..', 'data', 'uniher-playwright.db'),
    }),
    /inside the Playwright-owned data directory/,
  );
});

test('accepts a valid dedicated database path with the expected filename', () => {
  const createEnvironment = requireApi('createPlaywrightTestEnvironment');
  const validPath = path.join(__dirname, '.playwright-data', 'unit-valid', 'uniher-playwright.db');

  try {
    const environment = createEnvironment({ PLAYWRIGHT_DATABASE_PATH: validPath });
    assert.equal(environment.DATABASE_PATH, path.resolve(validPath));
    assert.equal(fs.existsSync(path.dirname(validPath)), true);
  } finally {
    fs.rmSync(path.dirname(validPath), { recursive: true, force: true });
  }
});

test('rejects a database with an unexpected filename even inside the test root', () => {
  const createEnvironment = requireApi('createPlaywrightTestEnvironment');

  assert.throws(
    () => createEnvironment({
      PLAYWRIGHT_DATABASE_PATH: path.join(__dirname, '.playwright-data', 'production.db'),
    }),
    /must be named uniher-playwright\.db/,
  );
});

test('teardown guard blocks without the Playwright marker or dedicated path', () => {
  const assertSafeEnvironment = requireApi('assertSafePlaywrightDatabaseEnvironment');

  assert.throws(
    () => assertSafeEnvironment({ DATABASE_PATH: safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH }),
    /PLAYWRIGHT_TEST=1/,
  );
  assert.throws(
    () => assertSafeEnvironment({ PLAYWRIGHT_TEST: '1' }),
    /DATABASE_PATH/,
  );
});

test('teardown guard accepts only the exact validated dedicated path', () => {
  const assertSafeEnvironment = requireApi('assertSafePlaywrightDatabaseEnvironment');

  assert.equal(
    assertSafeEnvironment({
      PLAYWRIGHT_TEST: '1',
      DATABASE_PATH: safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH,
    }),
    safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH,
  );
  assert.throws(
    () => assertSafeEnvironment({
      PLAYWRIGHT_TEST: '1',
      DATABASE_PATH: path.resolve(__dirname, '..', 'data', 'uniher.db'),
    }),
    /does not match the validated Playwright database/,
  );
});

test('config and teardown use the guard before any database module is imported', () => {
  const configSource = fs.readFileSync(path.join(__dirname, 'playwright.config.ts'), 'utf8');
  const teardownSource = fs.readFileSync(path.join(__dirname, 'global-teardown.ts'), 'utf8');
  const guardIndex = teardownSource.indexOf('assertSafePlaywrightDatabaseEnvironment(');
  const databaseImportIndex = teardownSource.indexOf("import('better-sqlite3')");

  assert.match(configSource, /createPlaywrightTestEnvironment/);
  assert.doesNotMatch(configSource, /process\.env\.DATABASE_PATH\s*\|\|/);
  assert.equal(guardIndex >= 0, true, 'teardown must call the guard');
  assert.equal(databaseImportIndex > guardIndex, true, 'database import must happen after the guard');
  assert.doesNotMatch(teardownSource, /import Database from 'better-sqlite3'/);
});
