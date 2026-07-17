import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { getReadDb, getWriteQueue } from '../index';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');

/** Cria tabela de controle de migrations se nao existir */
function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/** Retorna lista de migrations ja aplicadas */
function getAppliedMigrations(db: Database.Database): string[] {
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as { name: string }[];
  return rows.map((r) => r.name);
}

export type MigrationResult = 'applied' | 'skipped';

/** Applies SQL and its receipt atomically. Repeated filenames never re-run schema SQL. */
export function applyMigration(
  db: Database.Database,
  file: string,
  sql: string,
): MigrationResult {
  ensureMigrationsTable(db);
  const migrate = db.transaction((): MigrationResult => {
    const alreadyApplied = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(file);
    if (alreadyApplied) return 'skipped';
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    return 'applied';
  });
  return migrate.immediate();
}

/** Retorna lista de arquivos .sql na pasta de migrations, ordenados */
function getPendingMigrations(applied: string[]): string[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.filter((f) => !applied.includes(f));
}

/** Executa todas as migrations pendentes */
export async function runMigrations(): Promise<void> {
  const readDb = getReadDb();
  ensureMigrationsTable(readDb);
  const applied = getAppliedMigrations(readDb);
  const pending = getPendingMigrations(applied);

  if (pending.length === 0) {
    return;
  }

  const writeQueue = getWriteQueue();

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    await writeQueue.enqueue((db) => {
      applyMigration(db, file, sql);
    });

    console.log(`[migration] Applied: ${file}`);
  }
}
