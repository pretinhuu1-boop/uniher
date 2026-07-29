import { defineConfig } from '@playwright/test';
import os from 'os';
import path from 'path';
import playwrightDbSafety from './playwright-db-safety.cjs';

// Detect available resources — use half the CPUs, min 1, max 3
const defaultPort = process.env.PLAYWRIGHT_PORT || '3100';
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${defaultPort}`;
const playwrightEnvironment = playwrightDbSafety.createPlaywrightTestEnvironment(process.env);
const testServerEnv = {
  ...playwrightEnvironment,
  PLAYWRIGHT_PORT: defaultPort,
  ALLOW_INSECURE_HTTP_COOKIES: process.env.ALLOW_INSECURE_HTTP_COOKIES || 'true',
  YAVIX_MOCK: process.env.YAVIX_MOCK || '1',
};

Object.assign(process.env, testServerEnv);

const webServerCommand =
  process.platform === 'win32'
    ? 'powershell -NoProfile -Command "npm run db:seed; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $env:NODE_ENV=\'production\'; npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; node tests/start-playwright-server.cjs"'
    : 'npm run db:seed && NODE_ENV=production npm run build && node tests/start-playwright-server.cjs';

const cpus = os.cpus().length;
const autoWorkers = Math.max(1, Math.min(3, Math.floor(cpus / 2)));

export default defineConfig({
  testDir: './e2e',
  outputDir: './results',
  globalTeardown: './global-teardown.ts',
  timeout: 30000,
  retries: 0,
  fullyParallel: true,
  workers: autoWorkers,
  reporter: [
    ['html', { outputFolder: './report', open: 'never' }],
    ['json', { outputFile: './results/results.json' }],
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: webServerCommand,
        url: `${baseURL}/api/health`,
        cwd: path.resolve(__dirname, '..'),
        env: testServerEnv,
        reuseExistingServer: false,
        timeout: 180000,
      },
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    {
      name: 'platform-foundation',
      testMatch: 'platform-foundation.spec.ts',
      use: { headless: true, serviceWorkers: 'block' },
    },
    {
      name: 'privacy-wave-1-1',
      testMatch: 'wave-1-1-privacy.spec.ts',
      use: { headless: true, serviceWorkers: 'block' },
    },
    { name: 'master', testMatch: 'master.spec.ts' },
    { name: 'rh', testMatch: 'rh.spec.ts' },
    { name: 'colaboradora', testMatch: 'colaboradora.spec.ts' },
    { name: 'integrado', testMatch: 'integrado.spec.ts' },
    { name: 'seguranca', testMatch: 'seguranca.spec.ts' },
    { name: 'visual-ux', testMatch: 'visual-ux.spec.ts', use: { headless: true } },
    { name: 'mobile-shell', testMatch: 'mobile-collaborator-shell.spec.ts', use: { headless: true } },
    { name: 'community-feed', testMatch: 'community-feed.spec.ts', use: { headless: true, serviceWorkers: 'block' } },
    { name: 'community-feed-ui', testMatch: 'community-feed-ui.spec.ts', use: { headless: true, serviceWorkers: 'block' } },
  ],
});
