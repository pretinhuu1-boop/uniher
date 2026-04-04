import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const GET = withMasterAdmin(async (_req: NextRequest) => {
  await initDb();
  const db = getReadDb();

  const companies = (db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number }).count;
  const users = (db.prepare('SELECT COUNT(*) as count FROM users WHERE role != ?').get('admin') as { count: number }).count;
  const challenges = (db.prepare('SELECT COUNT(*) as count FROM challenges').get() as { count: number }).count;
  const badges = (db.prepare('SELECT COUNT(*) as count FROM badges').get() as { count: number }).count;
  const campaigns = (db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE status = ?').get('active') as { count: number }).count;
  const notifications = (db.prepare('SELECT COUNT(*) as count FROM notifications').get() as { count: number }).count;

  // Applied migrations
  let appliedMigrations: string[] = [];
  try {
    const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as { name: string }[];
    appliedMigrations = rows.map((r) => r.name);
  } catch {
    appliedMigrations = [];
  }

  // DB file size
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'uniher.db');
  let dbSizeBytes = 0;
  let walSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch { /* */ }
  try {
    walSizeBytes = fs.statSync(dbPath + '-wal').size;
  } catch { /* */ }

  // Uptime
  const uptime_seconds = Math.floor(process.uptime());

  // Memory
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  // CPU
  const cpuCores = os.cpus().length;

  // Node version
  const nodeVersion = process.version;

  // OS info (only type, not version — reduces reconnaissance risk)
  const platformType = os.type();

  // Disk usage (project directories)
  function dirSize(dir: string): number {
    try {
      let total = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        try {
          if (item.isFile()) {
            total += fs.statSync(fullPath).size;
          } else if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.next') {
            total += dirSize(fullPath);
          }
        } catch { /* skip inaccessible */ }
      }
      return total;
    } catch { return 0; }
  }

  const cwd = process.cwd();
  const dataDirSize = dirSize(path.join(cwd, 'data'));

  let nextDirSize = 0;
  try {
    // Only estimate .next size (can be huge), check if exists
    if (fs.existsSync(path.join(cwd, '.next'))) {
      nextDirSize = -1; // Exists but size not calculated (too slow)
    }
  } catch { /* */ }

  // Error log size
  let errorLogSize = 0;
  let errorLogLines = 0;
  const errorLogPath = path.join(cwd, 'data', 'errors.log');
  try {
    const stat = fs.statSync(errorLogPath);
    errorLogSize = stat.size;
    const content = fs.readFileSync(errorLogPath, 'utf-8');
    errorLogLines = content.split('\n').filter(l => l.startsWith('[')).length;
  } catch { /* */ }

  // Server log
  let serverLogSize = 0;
  const serverLogPath = path.join(cwd, 'data', 'server.log');
  try {
    serverLogSize = fs.statSync(serverLogPath).size;
  } catch { /* */ }

  // Backups count
  let backupsCount = 0;
  let backupsTotalSize = 0;
  const backupsDir = path.join(cwd, 'data', 'backups');
  try {
    const files = fs.readdirSync(backupsDir);
    backupsCount = files.filter(f => f.endsWith('.db')).length;
    for (const f of files) {
      try { backupsTotalSize += fs.statSync(path.join(backupsDir, f)).size; } catch { /* */ }
    }
  } catch { /* */ }

  return NextResponse.json({
    companies,
    users,
    challenges,
    badges,
    campaigns,
    notifications,
    db_size_kb: Math.round(dbSizeBytes / 1024),
    uptime_seconds,
    applied_migrations: appliedMigrations,
    // New master fields
    master: {
      memory: {
        heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(1),
        rssMB: +(mem.rss / 1024 / 1024).toFixed(1),
        systemTotalGB: +(totalMem / 1024 / 1024 / 1024).toFixed(1),
        systemFreeGB: +(freeMem / 1024 / 1024 / 1024).toFixed(1),
        systemUsedPercent: +((1 - freeMem / totalMem) * 100).toFixed(0),
      },
      cpu: {
        cores: cpuCores,
      },
      db: {
        sizeBytes: dbSizeBytes,
        sizeMB: +(dbSizeBytes / 1024 / 1024).toFixed(2),
        walSizeBytes,
        walSizeMB: +(walSizeBytes / 1024 / 1024).toFixed(2),
      },
      disk: {
        dataDirMB: +(dataDirSize / 1024 / 1024).toFixed(2),
        nextDirExists: nextDirSize !== 0,
      },
      logs: {
        errorLogSizeKB: +(errorLogSize / 1024).toFixed(1),
        errorLogEntries: errorLogLines,
        serverLogSizeKB: +(serverLogSize / 1024).toFixed(1),
      },
      backups: {
        count: backupsCount,
        totalSizeMB: +(backupsTotalSize / 1024 / 1024).toFixed(2),
      },
      system: {
        nodeVersion,
        platform: platformType,
      },
    },
  });
});
