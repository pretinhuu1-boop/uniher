#!/usr/bin/env node
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const port = process.env.PLAYWRIGHT_PORT || '3100';
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const playwrightDb = path.join(repoRoot, 'tests', '.playwright-data', 'uniher-playwright.db');
const standaloneServer = path.join(repoRoot, '.next', 'standalone', 'server.js');
const npmCli = process.env.npm_execpath || path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const playwrightCli = require.resolve('@playwright/test/cli');
const playwrightDbSafety = require('../tests/playwright-db-safety.cjs');
const playwrightEnv = playwrightDbSafety.createPlaywrightTestEnvironment({
  ...process.env,
  PLAYWRIGHT_DATABASE_PATH: process.env.PLAYWRIGHT_DATABASE_PATH || playwrightDb,
});

const smokeEnv = {
  ...process.env,
  PLAYWRIGHT_TEST: '1',
  PLAYWRIGHT_PORT: port,
  BASE_URL: baseUrl,
  ALLOW_INSECURE_HTTP_COOKIES: process.env.ALLOW_INSECURE_HTTP_COOKIES || 'true',
  YAVIX_MOCK: process.env.YAVIX_MOCK || '1',
  ...playwrightEnv,
  PLAYWRIGHT_DATABASE_PATH: process.env.PLAYWRIGHT_DATABASE_PATH || playwrightDb,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || baseUrl,
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: smokeEnv,
      stdio: options.stdio || 'inherit',
      shell: false,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function waitForHealth(timeoutMs = 240000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`${baseUrl}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
      req.on('error', retry);
    };

    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`server did not become healthy at ${baseUrl}/api/health`));
        return;
      }
      setTimeout(attempt, 2000);
    };

    attempt();
  });
}

async function main() {
  await run(process.execPath, [npmCli, 'run', 'db:seed']);

  const serverCommand = fsExists(standaloneServer)
    ? { file: process.execPath, args: ['tests/start-playwright-server.cjs'] }
    : {
        file: process.execPath,
        args: [
          path.join(repoRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
          'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          port,
        ],
      };

  const server = spawn(serverCommand.file, serverCommand.args, {
    cwd: repoRoot,
    env: smokeEnv,
    stdio: 'inherit',
    shell: false,
  });

  let serverExited = false;
  server.on('exit', (code) => {
    serverExited = true;
    if (code !== 0) console.error(`[visual-smoke-local] server exited with ${code}`);
  });

  try {
    await waitForHealth();
    if (serverExited) throw new Error('server exited before smoke execution');
    await run(process.execPath, [
      playwrightCli,
      'test',
      '--config=tests/playwright.config.ts',
      '--project=visual-ux',
      '--grep',
      '@visual-smoke',
    ]);
  } finally {
    if (!serverExited) server.kill('SIGTERM');
  }
}

function fsExists(filePath) {
  try {
    return require('node:fs').existsSync(filePath);
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
