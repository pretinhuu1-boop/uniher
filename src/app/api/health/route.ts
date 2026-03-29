/**
 * GET /api/health — health check endpoint
 * Returns DB status, uptime, memory, disk, and version.
 * Rate limited: 30 req/min per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { checkPublicRateLimit } from '@/lib/security/rate-limit';
import fs from 'fs';
import path from 'path';
import os from 'os';

const startTime = Date.now();

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDbSize(): number {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'uniher.db');
    const stats = fs.statSync(dbPath);
    // Also check WAL file
    let walSize = 0;
    try {
      walSize = fs.statSync(dbPath + '-wal').size;
    } catch { /* no WAL file */ }
    return stats.size + walSize;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest) {
  try { await checkPublicRateLimit(req); } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let dbStatus = 'ok';
  let userCount = 0;
  let companyCount = 0;

  try {
    const db = getReadDb();
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    userCount = users.count;
    const companies = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
    companyCount = companies.count;
  } catch {
    dbStatus = 'error';
  }

  const uptimeMs = Date.now() - startTime;
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(uptimeMs),
    uptimeSeconds: Math.floor(uptimeMs / 1000),
    db: {
      status: dbStatus,
      sizeBytes: getDbSize(),
      sizeMB: +(getDbSize() / 1024 / 1024).toFixed(2),
      users: userCount,
      companies: companyCount,
      writeQueue: getWriteQueue().getStats(),
    },
    memory: {
      heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(1),
      rssMB: +(mem.rss / 1024 / 1024).toFixed(1),
      totalSystemGB: +(totalMem / 1024 / 1024 / 1024).toFixed(1),
      percentUsed: +((mem.rss / totalMem) * 100).toFixed(1),
    },
    version: process.env.npm_package_version ?? '0.1.0',
  }, {
    status: dbStatus === 'ok' ? 200 : 503,
  });
}
