const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const safety = require('./playwright-db-safety.cjs');

function requireApi(name) {
  assert.equal(typeof safety[name], 'function', `${name} must be exported`);
  return safety[name];
}

function localEnvironment(overrides = {}) {
  return {
    PLAYWRIGHT_TEST: '1',
    DATABASE_PATH: safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH,
    ...overrides,
  };
}

test('community fixtures reject external BASE_URL without an explicit same-database opt-in', () => {
  const assertFixtureEnvironment = requireApi('assertCommunityFeedFixtureEnvironment');
  assert.throws(
    () => assertFixtureEnvironment(localEnvironment({ BASE_URL: 'http://127.0.0.1:4100' })),
    /external BASE_URL/i,
  );
});

test('community fixtures accept only loopback external servers attested to the exact test database', () => {
  const assertFixtureEnvironment = requireApi('assertCommunityFeedFixtureEnvironment');
  const optedIn = localEnvironment({
    BASE_URL: 'http://localhost:4100',
    COMMUNITY_FEED_EXTERNAL_SAME_DATABASE: '1',
    COMMUNITY_FEED_EXTERNAL_DATABASE_PATH: safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH,
  });

  assert.equal(assertFixtureEnvironment(optedIn), safety.DEFAULT_PLAYWRIGHT_DATABASE_PATH);
  assert.throws(
    () => assertFixtureEnvironment({ ...optedIn, BASE_URL: 'https://example.test' }),
    /loopback/i,
  );
  assert.throws(
    () => assertFixtureEnvironment({
      ...optedIn,
      COMMUNITY_FEED_EXTERNAL_DATABASE_PATH: path.resolve(__dirname, '..', 'data', 'uniher.db'),
    }),
    /same Playwright database/i,
  );
});

test('community E2E and global teardown guard external mode before local database mutation', () => {
  const e2eSource = fs.readFileSync(path.join(__dirname, 'e2e', 'community-feed.spec.ts'), 'utf8');
  const teardownSource = fs.readFileSync(path.join(__dirname, 'global-teardown.ts'), 'utf8');

  assert.match(e2eSource, /assertCommunityFeedFixtureEnvironment/);
  assert.ok(
    e2eSource.indexOf('assertCommunityFeedFixtureEnvironment')
      < e2eSource.indexOf('new Database'),
    'community fixture guard must run before opening the database',
  );
  assert.ok(
    teardownSource.indexOf('process.env.BASE_URL')
      < teardownSource.indexOf('assertSafePlaywrightDatabaseEnvironment'),
    'global teardown must stop external mode before resolving the local database',
  );
});
