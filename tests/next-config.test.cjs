const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { PHASE_PRODUCTION_BUILD } = require('next/constants');
const loadConfig = require('next/dist/server/config').default;

test('pins Next build roots to the repository', async () => {
  const repositoryRoot = path.resolve(__dirname, '..');
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, repositoryRoot);

  assert.equal(config.outputFileTracingRoot, repositoryRoot);
  assert.equal(config.turbopack?.root, repositoryRoot);
});
