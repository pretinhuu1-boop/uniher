import { defineConfig } from '@playwright/test';
import os from 'os';
import path from 'path';

// Detect available resources — use half the CPUs, min 1, max 3
const defaultPort = process.env.PLAYWRIGHT_PORT || '3100';
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${defaultPort}`;

const webServerCommand =
  process.platform === 'win32'
    ? `powershell -NoProfile -Command "$env:PLAYWRIGHT_TEST='1'; $env:PLAYWRIGHT_PORT='${defaultPort}'; npm run build; node tests/start-playwright-server.cjs"`
    : `PLAYWRIGHT_TEST=1 PLAYWRIGHT_PORT=${defaultPort} npm run build && PLAYWRIGHT_TEST=1 PLAYWRIGHT_PORT=${defaultPort} node tests/start-playwright-server.cjs`;

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
    { name: 'master', testMatch: 'master.spec.ts' },
    { name: 'rh', testMatch: 'rh.spec.ts' },
    { name: 'colaboradora', testMatch: 'colaboradora.spec.ts' },
    { name: 'integrado', testMatch: 'integrado.spec.ts' },
    { name: 'seguranca', testMatch: 'seguranca.spec.ts' },
    { name: 'visual-ux', testMatch: 'visual-ux.spec.ts', use: { headless: true } },
  ],
});
