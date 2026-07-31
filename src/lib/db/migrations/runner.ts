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
  const reconciledApplied = reconcileRenamedMigrations(getReadDb(), applied);
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.filter((f) => !reconciledApplied.includes(f));
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

const RENAMED_MIGRATIONS = [
  {
    legacyName: '048_user_exams_source.sql',
    canonicalName: '067_user_exams_source.sql',
    tableName: 'user_exams',
    columnName: 'source',
  },
];

function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const row = db
    .prepare("SELECT name FROM pragma_table_info(?) WHERE name = ?")
    .get(tableName, columnName);
  return Boolean(row);
}

/** Preserva compatibilidade quando uma migration ainda nao promovida foi renumerada. */
function reconcileRenamedMigrations(db: Database.Database, applied: string[]): string[] {
  const appliedSet = new Set(applied);
  const reconciled = [...applied];

  for (const migration of RENAMED_MIGRATIONS) {
    if (
      appliedSet.has(migration.legacyName)
      && !appliedSet.has(migration.canonicalName)
      && fs.existsSync(path.join(MIGRATIONS_DIR, migration.canonicalName))
      && hasColumn(db, migration.tableName, migration.columnName)
    ) {
      db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run(migration.canonicalName);
      appliedSet.add(migration.canonicalName);
      reconciled.push(migration.canonicalName);
    }
  }

  return reconciled;
}
