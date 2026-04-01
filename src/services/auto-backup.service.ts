import fs from 'fs';
import path from 'path';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';

const LAST_DAY_KEY = 'auto_backup_last_day';
const ENABLED_KEY = 'auto_backup_enabled';
const HOUR_KEY = 'auto_backup_hour';
const DEFAULT_RETENTION = 10;
const DEFAULT_HOUR = 2;

function getDbPath(): string {
  const configured = process.env.DATABASE_PATH;
  if (!configured) return path.join(process.cwd(), 'data', 'uniher.db');
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function getBackupsDir(): string {
  return path.join(process.cwd(), 'data', 'backups');
}

function localDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localStamp(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function pruneBackups(backupsDir: string, keep = DEFAULT_RETENTION): number {
  if (!fs.existsSync(backupsDir)) return 0;
  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(backupsDir, f);
      const st = fs.statSync(full);
      return { name: f, full, mtime: st.mtime.getTime() };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const toDelete = files.slice(keep);
  for (const file of toDelete) {
    try { fs.unlinkSync(file.full); } catch { /* ignore */ }
  }
  return toDelete.length;
}

function getLastAutoBackupDay(db = getReadDb()): string | null {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ? LIMIT 1').get(LAST_DAY_KEY) as { value?: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function setLastAutoBackupDay(day: string, db = getReadDb()): void {
  db.prepare(`
    INSERT INTO system_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(LAST_DAY_KEY, day);
}

function getAutoBackupConfig(db = getReadDb()): { enabled: boolean; hour: number } {
  try {
    const rows = db.prepare(`
      SELECT key, value
      FROM system_settings
      WHERE key IN (?, ?)
    `).all(ENABLED_KEY, HOUR_KEY) as { key: string; value: string }[];

    let enabled = true;
    let hour = DEFAULT_HOUR;

    for (const row of rows) {
      if (row.key === ENABLED_KEY) {
        enabled = row.value !== '0';
      }
      if (row.key === HOUR_KEY) {
        const parsed = Number.parseInt(row.value, 10);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 23) {
          hour = parsed;
        }
      }
    }

    return { enabled, hour };
  } catch {
    return { enabled: true, hour: DEFAULT_HOUR };
  }
}

export function createDatabaseBackup(prefix = 'uniher-auto'): { name: string; sizeKB: number; pruned: number } {
  const dbPath = getDbPath();
  const backupsDir = getBackupsDir();

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Banco não encontrado em ${dbPath}`);
  }
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const name = `${prefix}-${localStamp()}.db`;
  const dest = path.join(backupsDir, name);
  fs.copyFileSync(dbPath, dest);
  const sizeKB = Math.round(fs.statSync(dest).size / 1024);
  const pruned = pruneBackups(backupsDir, DEFAULT_RETENTION);
  return { name, sizeKB, pruned };
}

export async function runDailyAutoBackupIfDue(now = new Date()): Promise<{ ran: boolean; reason?: string; backup?: string }> {
  await initDb();

  const config = getAutoBackupConfig();
  if (!config.enabled) return { ran: false, reason: 'disabled' };

  const hour = now.getHours();
  if (hour !== config.hour) return { ran: false, reason: 'outside-window' };

  const day = localDayKey(now);
  const last = getLastAutoBackupDay();
  if (last === day) return { ran: false, reason: 'already-ran-today' };

  const result = createDatabaseBackup('uniher-auto');
  setLastAutoBackupDay(day);
  return { ran: true, backup: result.name };
}
