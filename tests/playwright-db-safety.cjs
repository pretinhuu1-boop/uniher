const fs = require('node:fs');
const path = require('node:path');

const PLAYWRIGHT_DATABASE_FILENAME = 'uniher-playwright.db';
const PLAYWRIGHT_DATA_ROOT = path.resolve(__dirname, '.playwright-data');
const DEFAULT_PLAYWRIGHT_DATABASE_PATH = path.join(
  PLAYWRIGHT_DATA_ROOT,
  PLAYWRIGHT_DATABASE_FILENAME,
);

const TEST_JWT_SECRET = 'uniher-playwright-access-secret-at-least-32-characters';
const TEST_JWT_REFRESH_SECRET = 'uniher-playwright-refresh-secret-at-least-32-characters';

function assertOwnedDatabasePath(databasePath) {
  const resolvedPath = path.resolve(databasePath);
  const relativePath = path.relative(PLAYWRIGHT_DATA_ROOT, resolvedPath);
  const isInsideRoot = relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);

  if (!isInsideRoot) {
    throw new Error(
      `PLAYWRIGHT_DATABASE_PATH must stay inside the Playwright-owned data directory: ${PLAYWRIGHT_DATA_ROOT}`,
    );
  }

  if (path.basename(resolvedPath) !== PLAYWRIGHT_DATABASE_FILENAME) {
    throw new Error(`Playwright database must be named ${PLAYWRIGHT_DATABASE_FILENAME}`);
  }

  return resolvedPath;
}

function resolvePlaywrightDatabasePath(environment = process.env) {
  const requestedPath = environment.PLAYWRIGHT_DATABASE_PATH?.trim();
  return assertOwnedDatabasePath(requestedPath || DEFAULT_PLAYWRIGHT_DATABASE_PATH);
}

function createPlaywrightTestEnvironment(environment = process.env) {
  const databasePath = resolvePlaywrightDatabasePath(environment);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  return {
    PLAYWRIGHT_TEST: '1',
    DATABASE_PATH: databasePath,
    JWT_SECRET: environment.JWT_SECRET || TEST_JWT_SECRET,
    JWT_REFRESH_SECRET: environment.JWT_REFRESH_SECRET || TEST_JWT_REFRESH_SECRET,
  };
}

function assertSafePlaywrightDatabaseEnvironment(environment = process.env) {
  if (environment.PLAYWRIGHT_TEST !== '1') {
    throw new Error('Refusing Playwright database access without PLAYWRIGHT_TEST=1');
  }

  if (!environment.DATABASE_PATH?.trim()) {
    throw new Error('Refusing Playwright database access without DATABASE_PATH');
  }

  const expectedPath = resolvePlaywrightDatabasePath(environment);
  const actualPath = path.resolve(environment.DATABASE_PATH);

  if (actualPath !== expectedPath) {
    throw new Error('DATABASE_PATH does not match the validated Playwright database');
  }

  return actualPath;
}

module.exports = {
  DEFAULT_PLAYWRIGHT_DATABASE_PATH,
  PLAYWRIGHT_DATABASE_FILENAME,
  PLAYWRIGHT_DATA_ROOT,
  assertSafePlaywrightDatabaseEnvironment,
  createPlaywrightTestEnvironment,
  resolvePlaywrightDatabasePath,
};
