import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import fs from 'fs';
import path from 'path';

export const GET = withRole('admin')(async (_req: NextRequest) => {
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
  let db_size_kb = 0;
  try {
    db_size_kb = Math.round(fs.statSync(dbPath).size / 1024);
  } catch {
    db_size_kb = 0;
  }

  // Uptime in seconds (process.uptime())
  const uptime_seconds = Math.floor(process.uptime());

  return NextResponse.json({
    companies,
    users,
    challenges,
    badges,
    campaigns,
    notifications,
    db_size_kb,
    uptime_seconds,
    applied_migrations: appliedMigrations,
  });
});
