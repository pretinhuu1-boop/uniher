import fs from 'fs';
import path from 'path';
import { getReadDb, getWriteQueue } from '../index';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');

const RENAMED_MIGRATIONS = [
  {
    legacyName: '048_user_exams_source.sql',
    canonicalName: '067_user_exams_source.sql',
    tableName: 'user_exams',
    columnName: 'source',
  },
];

/** Cria tabela de controle de migrations se nao existir */
function ensureMigrationsTable(): void {
  const db = getReadDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/** Retorna lista de migrations ja aplicadas */
function getAppliedMigrations(): string[] {
  const db = getReadDb();
  const rows = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as { name: string }[];
  return rows.map((r) => r.name);
}

function hasColumn(tableName: string, columnName: string): boolean {
  const db = getReadDb();
  const row = db
    .prepare("SELECT name FROM pragma_table_info(?) WHERE name = ?")
    .get(tableName, columnName);
  return Boolean(row);
}

/** Preserva compatibilidade quando uma migration ainda nao promovida foi renumerada. */
function reconcileRenamedMigrations(applied: string[]): string[] {
  const db = getReadDb();
  const appliedSet = new Set(applied);
  const reconciled = [...applied];

  for (const migration of RENAMED_MIGRATIONS) {
    if (
      appliedSet.has(migration.legacyName)
      && !appliedSet.has(migration.canonicalName)
      && fs.existsSync(path.join(MIGRATIONS_DIR, migration.canonicalName))
      && hasColumn(migration.tableName, migration.columnName)
    ) {
      db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run(migration.canonicalName);
      appliedSet.add(migration.canonicalName);
      reconciled.push(migration.canonicalName);
    }
  }

  return reconciled;
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
  ensureMigrationsTable();
  const applied = reconcileRenamedMigrations(getAppliedMigrations());
  const pending = getPendingMigrations(applied);

  if (pending.length === 0) {
    return;
  }

  const writeQueue = getWriteQueue();

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

    await writeQueue.enqueue((db) => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    console.log(`[migration] Applied: ${file}`);
  }
}
