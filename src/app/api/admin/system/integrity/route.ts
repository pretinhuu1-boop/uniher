import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { devOnlyGuard } from '@/lib/api/dev-only';
import { getReadDb, walCheckpoint } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const POST = withMasterAdmin(async (_req: NextRequest) => {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;
  await initDb();
  const db = getReadDb();

  // Integrity check
  const integrityResult = db.pragma('integrity_check') as { integrity_check: string }[];
  const integrityOk = integrityResult[0]?.integrity_check === 'ok';

  // WAL checkpoint
  let walResult: any = null;
  try {
    walCheckpoint();
    walResult = db.pragma('wal_checkpoint(PASSIVE)');
  } catch { /* */ }

  // Foreign key check
  const fkResult = db.pragma('foreign_key_check') as any[];
  const fkOk = fkResult.length === 0;

  // Table count
  const tables = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get() as { count: number };

  return NextResponse.json({
    integrity: {
      status: integrityOk ? 'ok' : 'error',
      result: integrityResult[0]?.integrity_check || 'unknown',
    },
    foreignKeys: {
      status: fkOk ? 'ok' : 'error',
      violations: fkResult.length,
    },
    wal: walResult,
    tables: tables.count,
  });
});
