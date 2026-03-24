import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { devOnlyGuard } from '@/lib/api/dev-only';
import fs from 'fs';
import path from 'path';

export const POST = withRole('admin')(async (_req: NextRequest) => {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;
  const cwd = process.cwd();
  const dbPath = process.env.DATABASE_PATH || path.join(cwd, 'data', 'uniher.db');
  const backupsDir = path.join(cwd, 'data', 'backups');

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ error: 'Banco de dados não encontrado' }, { status: 404 });
  }

  // Create backups dir if needed
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const name = `uniher-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.db`;
  const dest = path.join(backupsDir, name);

  fs.copyFileSync(dbPath, dest);
  const size = fs.statSync(dest).size;

  return NextResponse.json({
    success: true,
    backup: name,
    sizeKB: Math.round(size / 1024),
    path: `data/backups/${name}`,
  });
});
