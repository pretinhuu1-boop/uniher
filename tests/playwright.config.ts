import { defineConfig } from '@playwright/test';
import os from 'os';

// Detect available resources — use half the CPUs, min 1, max 3
const cpus = os.cpus().length;
const autoWorkers = Math.max(1, Math.min(3, Math.floor(cpus / 2)));

export default defineConfig({
  testDir: './e2e',
  outputDir: './results',
  timeout: 30000,
  retries: 0,
  fullyParallel: true,
  workers: autoWorkers,
  reporter: [
    ['html', { outputFolder: './report', open: 'never' }],
    ['json', { outputFile: './results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
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
  ],
});
