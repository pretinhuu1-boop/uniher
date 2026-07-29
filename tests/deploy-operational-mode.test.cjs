const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

test('production deploy runs migrations without unconditional demo seed', () => {
  const deployScript = fs.readFileSync(path.join(repoRoot, 'deploy/vps/deploy.sh'), 'utf8');

  assert.match(deployScript, /npm run db:migrate/);
  assert.match(deployScript, /UNIHER_RUN_DEMO_SEED/);
  assert.match(deployScript, /npm run db:seed/);
  assert.doesNotMatch(deployScript, /echo "\[5\/6\][\s\S]{0,120}npm run db:seed/);
});

test('package exposes a migration-only database script', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts['db:migrate'], 'tsx src/lib/db/migrate.ts');
  assert.equal(packageJson.scripts['db:seed'], 'tsx src/lib/db/seed.ts');
});

test('homologation seed does not print fixture passwords', () => {
  const seedSource = fs.readFileSync(path.join(repoRoot, 'src/lib/db/seed.ts'), 'utf8');
  const passwordLogLines = seedSource
    .split(/\r?\n/)
    .filter((line) => line.includes('console.') && line.includes('Admin@2026'));

  assert.deepEqual(passwordLogLines, []);
});
