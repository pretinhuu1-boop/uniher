import Database from 'better-sqlite3';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const retiredProductionPassword = ['Admin', '@2026'].join('');

function readProjectFile(...segments: string[]): string {
  return readFileSync(path.join(root, ...segments), 'utf8');
}

function listTextFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    if (statSync(filePath).isDirectory()) {
      return listTextFiles(filePath);
    }
    return /\.(?:[cm]?[jt]sx?|md|html|json|sql|sh|bat|cjs)$/.test(entry)
      ? [filePath]
      : [];
  });
}

describe('production database bootstrap policy', () => {
  it('deploys with migrations only and never runs the reference-data seed', () => {
    const deploy = readProjectFile('deploy', 'vps', 'deploy.sh');
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      scripts: Record<string, string>;
    };

    expect(deploy).toContain('npm run db:migrate');
    expect(deploy).not.toMatch(/npm\s+run\s+db:seed/);
    expect(packageJson.scripts['db:migrate']).toContain('initDb');
    expect(packageJson.scripts['db:migrate']).not.toContain('seed');
  });

  it('keeps the reference-data seed free of accounts and published credentials', () => {
    const seed = readProjectFile('src', 'lib', 'db', 'seed.ts');
    const deployGuide = readProjectFile('docs', 'deploy-vps-hostinger.md');

    expect(seed).not.toContain(retiredProductionPassword);
    expect(seed).not.toContain('is_approved');
    expect(seed).not.toMatch(/(?:INSERT\s+INTO|UPDATE)\s+users\b/i);
    expect(seed).not.toMatch(/INSERT\s+INTO\s+companies\b/i);
    expect(seed).not.toContain('hashPassword');
    expect(deployGuide).not.toContain(retiredProductionPassword);
    expect(deployGuide).not.toMatch(/Usu[aá]rios padr[aã]o do seed/);
  });

  it('keeps the retired production password out of source, tests and operator docs', () => {
    const roots = ['src', 'tests', 'docs', 'deploy', 'public'];
    const files = roots.flatMap((directory) =>
      listTextFiles(path.join(root, directory)),
    );

    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toContain(retiredProductionPassword);
    }
  });

  it('runs the complete reference-data seed on a fresh database', () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'uniher-seed-'));
    const databasePath = path.join(tempDir, 'uniher.db');

    try {
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', path.join(root, 'src', 'lib', 'db', 'seed.ts')],
        {
          cwd: root,
          env: { ...process.env, DATABASE_PATH: databasePath },
          encoding: 'utf8',
          timeout: 120_000,
        },
      );

      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).not.toContain(retiredProductionPassword);
      expect(`${result.stdout}\n${result.stderr}`).not.toMatch(
        /admin@uniher\.com\.br\s*\//,
      );

      const db = new Database(databasePath, { readonly: true });
      expect(db.pragma('foreign_key_check')).toEqual([]);
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get(),
      ).toEqual({ count: 0 });
      db.close();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('runs the production migration command to completion', () => {
    const databasePath = path.join(
      tmpdir(),
      `uniher-migrate-${process.pid}-${Date.now()}.db`,
    );
    const packageJson = JSON.parse(readProjectFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const command = packageJson.scripts['db:migrate'];
    const expression = command.match(/^tsx -e "([\s\S]+)"$/)?.[1];
    expect(expression).toBeDefined();

    try {
      const result = spawnSync(
        process.execPath,
        [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), '-e', expression!],
        {
        cwd: root,
        env: { ...process.env, DATABASE_PATH: databasePath },
        encoding: 'utf8',
        timeout: 15_000,
        },
      );

      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);

      const db = new Database(databasePath, { readonly: true });
      expect(db.pragma('foreign_key_check')).toEqual([]);
      db.close();
    } finally {
      for (const suffix of ['', '-wal', '-shm']) {
        rmSync(`${databasePath}${suffix}`, { force: true });
      }
    }
  });
});
