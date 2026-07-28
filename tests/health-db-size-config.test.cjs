const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const healthRoutePath = path.join(repoRoot, 'src', 'app', 'api', 'health', 'route.ts');
const source = fs.readFileSync(healthRoutePath, 'utf8');

test('health DB size uses configured DATABASE_PATH and avoids duplicate stat reads', () => {
  assert.match(source, /const configuredDbPath = process\.env\.DATABASE_PATH;/);
  assert.match(source, /path\.isAbsolute\(configuredDbPath\)/);
  assert.match(source, /path\.join\(\/\* turbopackIgnore: true \*\/ process\.cwd\(\), configuredDbPath\)/);
  assert.match(source, /const dbSize = getDbSize\(\);/);
  assert.match(source, /sizeBytes: dbSize/);
  assert.match(source, /sizeMB: \+\(dbSize \/ 1024 \/ 1024\)\.toFixed\(2\)/);
});
