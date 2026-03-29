import Database from 'better-sqlite3';
import path from 'path';
import { WriteQueue } from './write-queue';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'uniher.db');

let _db: Database.Database | null = null;
let _writeQueue: WriteQueue | null = null;

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000');
  return db;
}

function getDb(): Database.Database {
  if (!_db) {
    _db = createConnection();
  }

  // Auto-recovery: if connection is broken, reconnect
  try {
    _db.prepare('SELECT 1').get();
  } catch {
    console.warn('[DB] Connection lost, reconnecting...');
    try { _db.close(); } catch { /* ignore */ }
    _db = createConnection();
    _writeQueue = null;
  }

  return _db;
}

/** Acesso direto para leituras (concorrente, sem fila) */
export function getReadDb(): Database.Database {
  return getDb();
}

/** Fila de escritas (serializado, uma operacao por vez) */
export function getWriteQueue(): WriteQueue {
  if (!_writeQueue) {
    _writeQueue = new WriteQueue(getDb());
  }
  return _writeQueue;
}

/** WAL checkpoint — previne crescimento excessivo do WAL */
export function walCheckpoint(): void {
  try {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.warn('[DB] WAL checkpoint failed:', err);
  }
}

/** Fechar conexao (para shutdown graceful) */
export function closeDb(): void {
  if (_writeQueue) {
    _writeQueue.destroy();
    _writeQueue = null;
  }
  if (_db) {
    try { _db.pragma('wal_checkpoint(TRUNCATE)'); } catch { /* ignore */ }
    _db.close();
    _db = null;
  }
}
