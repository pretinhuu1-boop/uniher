const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const playwrightCli = require.resolve('@playwright/test/cli');

const result = spawnSync(
  process.execPath,
  [
    playwrightCli,
    'test',
    '--config=playwright.config.ts',
    '--project=visual-ux',
    '--grep',
    '@visual-smoke',
  ],
  {
    cwd: path.join(repoRoot, 'tests'),
    env: {
      ...process.env,
      VISUAL_UX_CAPTURE_SCREENSHOTS: process.env.VISUAL_UX_CAPTURE_SCREENSHOTS ?? '1',
    },
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
