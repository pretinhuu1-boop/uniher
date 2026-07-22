import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import * as migrationRunner from '@/lib/db/migrations/runner';

const databases: Database.Database[] = [];

function createHistoryDatabase() {
  const db = new Database(':memory:');
  databases.push(db);
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      also_collaborator INTEGER DEFAULT 0
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('badge', 'level', 'campaign', 'challenge', 'alert', 'streak', 'gamification', 'reward', 'lesson', 'system')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
    CREATE TABLE alert_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      days_before INTEGER DEFAULT 3,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      entity_label TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users (id, role, also_collaborator) VALUES
      ('collaborator-ana', 'colaboradora', 0), ('rh-user', 'rh', 0),
      ('leadership-user', 'lideranca', 0), ('dual-leadership-user', 'lideranca', 1),
      ('admin-user', 'admin', 0);
    PRAGMA ignore_check_constraints = ON;
    INSERT INTO notifications (id, user_id, type, title, message) VALUES
      ('personal-reminder', 'collaborator-ana', 'reminder', 'Exame de hoje', 'Mamografia - hoje'),
      ('manager-agenda-alert', 'rh-user', 'alert', 'Exame de colaboradora em 2 dias', 'Ana / mamografia / 09:30'),
      ('manager-agenda-system', 'leadership-user', 'system', 'Consulta agendada', 'Ana / mamografia / 09:30'),
      ('manager-legacy-exam-system', 'rh-user', 'system', 'Exame agendada', 'Ana / exame legado / 09:30'),
      ('dual-personal-exam', 'dual-leadership-user', 'system', 'Exame agendado', 'Meu exame pessoal'),
      ('unrelated-alert', 'rh-user', 'alert', 'Atualizacao cadastral', 'Revise os dados da empresa'),
      ('unrelated-system', 'admin-user', 'system', 'Backup concluido', 'Rotina finalizada');
    PRAGMA ignore_check_constraints = OFF;
    INSERT INTO alert_preferences (id, user_id, alert_type) VALUES
      ('pref-collaborator', 'collaborator-ana', 'exame'), ('pref-rh', 'rh-user', 'exame'),
      ('pref-leadership', 'leadership-user', 'consulta'), ('pref-admin', 'admin-user', 'all');
  `);
  return db;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('migration 048 Agenda history containment', () => {
  it('applies once, removes only manager Agenda traces and records count-only audit', () => {
    const db = createHistoryDatabase();
    const applyMigration = (migrationRunner as typeof migrationRunner & {
      applyMigration?: (database: Database.Database, file: string, sql: string) => 'applied' | 'skipped';
    }).applyMigration;
    expect(applyMigration).toBeTypeOf('function');

    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '048_agenda_privacy_containment.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(applyMigration?.(db, '048_agenda_privacy_containment.sql', sql)).toBe('applied');
    expect(applyMigration?.(db, '048_agenda_privacy_containment.sql', sql)).toBe('skipped');

    const canaryRows = db.prepare("SELECT id FROM notifications WHERE message LIKE '%Ana%'").all();
    const unrelatedRows = db.prepare("SELECT id FROM notifications WHERE id LIKE 'unrelated-%' ORDER BY id").all();
    const personalReminder = db.prepare("SELECT source, resource_id FROM notifications WHERE id = 'personal-reminder'").get();
    const dualPersonalExam = db.prepare("SELECT id, title FROM notifications WHERE id = 'dual-personal-exam'").get();
    const managerPreferences = db.prepare(`
      SELECT ap.id FROM alert_preferences ap JOIN users u ON u.id = ap.user_id
      WHERE u.role IN ('rh', 'lideranca', 'admin')
    `).all();
    const collaboratorPreferences = db.prepare("SELECT id FROM alert_preferences WHERE user_id = 'collaborator-ana'").all();
    const auditReceipts = db.prepare(`
      SELECT details FROM audit_logs WHERE id = 'migration_048_agenda_privacy_containment'
    `).all() as { details: string }[];
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notifications'").all() as { name: string }[];

    expect(canaryRows).toEqual([]);
    expect(unrelatedRows).toHaveLength(2);
    expect(personalReminder).toMatchObject({ source: null, resource_id: null });
    expect(dualPersonalExam).toEqual({ id: 'dual-personal-exam', title: 'Exame agendado' });
    expect(managerPreferences).toEqual([]);
    expect(collaboratorPreferences).toHaveLength(1);
    expect(auditReceipts).toHaveLength(1);
    expect(auditReceipts[0].details).not.toContain('Ana');
    expect(indexes.map(({ name }) => name)).toContain('idx_notifications_user_read');
  });

  it('rolls back schema changes and receipt when a migration fails', () => {
    const db = createHistoryDatabase();
    const applyMigration = (migrationRunner as typeof migrationRunner & {
      applyMigration?: (database: Database.Database, file: string, sql: string) => 'applied' | 'skipped';
    }).applyMigration;
    expect(applyMigration).toBeTypeOf('function');

    expect(() => applyMigration?.(db, 'invalid.sql', 'CREATE TABLE should_rollback (id TEXT); THIS IS INVALID SQL;')).toThrow();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'").get()).toBeUndefined();
    expect(db.prepare("SELECT name FROM _migrations WHERE name = 'invalid.sql'").get()).toBeUndefined();
  });

  it('checks and records the migration under an immediate transaction lock', () => {
    const statements: string[] = [];
    const db = new Database(':memory:', { verbose: (sql) => statements.push(String(sql)) });
    databases.push(db);
    const applyMigration = migrationRunner.applyMigration;

    expect(applyMigration(db, 'locked.sql', 'CREATE TABLE locked_migration (id TEXT);')).toBe('applied');
    expect(applyMigration(db, 'locked.sql', 'THIS MUST NEVER EXECUTE;')).toBe('skipped');
    expect(statements.filter((sql) => sql === 'BEGIN IMMEDIATE')).toHaveLength(2);
  });
});
