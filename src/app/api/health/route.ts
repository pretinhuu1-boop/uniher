/**
 * GET /api/health — health check endpoint
 * Returns DB status, uptime, and version. Safe to expose publicly.
 */
import { NextResponse } from 'next/server';
import { getReadDb } from '@/lib/db';

const startTime = Date.now();

export async function GET() {
  let dbStatus = 'ok';
  let userCount = 0;

  try {
    const db = getReadDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    userCount = row.count;
  } catch {
    dbStatus = 'error';
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    db: dbStatus,
    users: userCount,
    version: process.env.npm_package_version ?? '0.1.0',
  }, {
    status: dbStatus === 'ok' ? 200 : 503,
  });
}
