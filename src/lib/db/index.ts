import Database from 'better-sqlite3';
import path from 'path';
import { WriteQueue } from './write-queue';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'uniher.db');

let _db: Database.Database | null = null;
let _writeQueue: WriteQueue | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);

    // WAL mode: permite leituras concorrentes durante escritas
    _db.pragma('journal_mode = WAL');
    // Timeout de 5s se o DB estiver ocupado
    _db.pragma('busy_timeout = 5000');
    // NORMAL sync: boa performance com seguranca adequada em WAL
    _db.pragma('synchronous = NORMAL');
    // Habilitar foreign keys
    _db.pragma('foreign_keys = ON');
    // Cache de 64MB
    _db.pragma('cache_size = -64000');
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

/** Fechar conexao (para shutdown graceful) */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    _writeQueue = null;
  }
}
