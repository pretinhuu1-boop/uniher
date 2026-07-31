import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

describe('default challenge archetype integrity', () => {
  it('uses the canonical arc_ archetype IDs in fresh seed data', () => {
    const seed = readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'db', 'seed.ts'),
      'utf8',
    );

    expect(seed).not.toMatch(/arche:\s*'arch_(guardia|protetora|guerreira)'/);
    expect(seed).toContain("arche: 'arc_guardia'");
    expect(seed).toContain("arche: 'arc_protetora'");
    expect(seed).toContain("arche: 'arc_guerreira'");
  });

  it('repairs legacy challenge references without changing valid custom values', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = OFF');
    db.exec(`
      CREATE TABLE archetypes (id TEXT PRIMARY KEY);
      CREATE TABLE challenges (
        id TEXT PRIMARY KEY,
        archetype_id TEXT REFERENCES archetypes(id)
      );
      CREATE TABLE _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO archetypes (id)
      VALUES ('arc_guardia'), ('arc_protetora'), ('arc_guerreira'), ('custom_arc');
      INSERT INTO challenges (id, archetype_id)
      VALUES
        ('one', 'arch_guardia'),
        ('two', 'arch_protetora'),
        ('three', 'arch_guerreira'),
        ('custom', 'custom_arc'),
        ('none', NULL);
    `);
    db.pragma('foreign_keys = ON');

    const migrationPath = path.join(
      process.cwd(),
      'src',
      'lib',
      'db',
      'migrations',
      '071_repair_challenge_archetype_ids.sql',
    );
    applyMigration(
      db,
      '071_repair_challenge_archetype_ids.sql',
      readFileSync(migrationPath, 'utf8'),
    );

    const rows = db.prepare(
      'SELECT id, archetype_id FROM challenges ORDER BY id',
    ).all();
    expect(rows).toEqual([
      { id: 'custom', archetype_id: 'custom_arc' },
      { id: 'none', archetype_id: null },
      { id: 'one', archetype_id: 'arc_guardia' },
      { id: 'three', archetype_id: 'arc_guerreira' },
      { id: 'two', archetype_id: 'arc_protetora' },
    ]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    db.close();
  });
});
