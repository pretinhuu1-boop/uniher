import { runMigrations } from './migrations/runner';
import fs from 'fs';
import path from 'path';

let initialized = false;

/** Inicializa o banco de dados: cria pasta data/ e roda migrations */
export async function initDb(): Promise<void> {
  if (initialized) return;

  // Garantir que a pasta data/ existe
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  await runMigrations();
  initialized = true;
}
