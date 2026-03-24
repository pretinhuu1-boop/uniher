import fs from 'fs';
import path from 'path';

let shutdownRegistered = false;

function logToFile(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'data', 'server.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch {
    // Ignore file write errors during shutdown
  }
}

function gracefulShutdown(reason: string) {
  logToFile(`Shutdown: ${reason}`);
  console.log(`\n[UniHER] Shutdown: ${reason}`);

  try {
    // Dynamic import to avoid circular dependencies
    const { closeDb } = require('@/lib/db');
    closeDb();
    logToFile('Database closed successfully');
  } catch {
    logToFile('Database close failed or not available');
  }

  process.exit(reason.includes('uncaught') || reason.includes('unhandled') ? 1 : 0);
}

export function registerShutdownHandlers() {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logToFile(`uncaughtException: ${err.message}\n${err.stack}`);
    console.error('[UniHER] uncaughtException:', err);
    gracefulShutdown(`uncaughtException: ${err.message}`);
  });

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    logToFile(`unhandledRejection: ${msg}`);
    console.error('[UniHER] unhandledRejection:', reason);
    // Don't exit on unhandled rejection — log and continue
  });

  logToFile('Shutdown handlers registered');
}
