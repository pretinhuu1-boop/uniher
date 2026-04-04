import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { devOnlyGuard } from '@/lib/api/dev-only';
import fs from 'fs';
import path from 'path';

export const POST = withMasterAdmin(async (req: NextRequest) => {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;
  const { type } = await req.json() as { type: 'errors' | 'server' | 'all' };
  const cwd = process.cwd();
  const cleared: string[] = [];

  if (type === 'errors' || type === 'all') {
    const p = path.join(cwd, 'data', 'errors.log');
    try { fs.writeFileSync(p, ''); cleared.push('errors.log'); } catch { /* */ }
  }

  if (type === 'server' || type === 'all') {
    const p = path.join(cwd, 'data', 'server.log');
    try { fs.writeFileSync(p, ''); cleared.push('server.log'); } catch { /* */ }
  }

  return NextResponse.json({ success: true, cleared });
});
