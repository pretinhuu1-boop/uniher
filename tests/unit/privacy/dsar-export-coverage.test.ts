import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createDsarExportJsonChunks } from '@/lib/privacy/dsar-export';

function createBaseDsarDatabase() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      department_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT,
      avatar_url TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      league TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE quiz_results (id TEXT PRIMARY KEY, user_id TEXT, archetype_id TEXT, answers_json TEXT, created_at TEXT);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT, read INTEGER, created_at TEXT);
    CREATE TABLE badges (id TEXT PRIMARY KEY, name TEXT, description TEXT);
    CREATE TABLE user_badges (user_id TEXT, badge_id TEXT, unlocked_at TEXT);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, dimension TEXT, score REAL, recorded_at TEXT);
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE user_challenges (user_id TEXT, challenge_id TEXT, progress INTEGER, status TEXT, started_at TEXT, completed_at TEXT);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, points_earned INTEGER, created_at TEXT);
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, action TEXT, day TEXT, mood TEXT, glasses INTEGER, challenge_id TEXT, note TEXT, created_at TEXT);

    INSERT INTO users (id, company_id, department_id, name, email, role, created_at, updated_at)
    VALUES
      ('user-a', 'company-a', NULL, 'Ana Silva', 'ana@example.com', 'colaboradora', '2026-01-01', '2026-01-02'),
      ('user-b', 'company-a', NULL, 'Bia Silva', 'bia@example.com', 'colaboradora', '2026-01-01', '2026-01-02');
  `);
  return db;
}

describe('DSAR export coverage', () => {
  it('exports health events, consent records, and uploads for the data subject only', () => {
    const db = createBaseDsarDatabase();
    try {
      db.exec(`
        CREATE TABLE health_events (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          company_id TEXT,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT,
          notes TEXT,
          status TEXT,
          reminder_sent INTEGER,
          created_at TEXT,
          updated_at TEXT,
          deleted_at TEXT
        );
        CREATE TABLE user_consents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          consent_type TEXT NOT NULL,
          granted INTEGER NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          granted_at TEXT,
          revoked_at TEXT
        );
        CREATE TABLE user_uploads (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          category TEXT NOT NULL,
          created_at TEXT
        );

        INSERT INTO health_events (id, user_id, company_id, title, type, date, time, notes, status, reminder_sent, created_at, updated_at, deleted_at)
        VALUES
          ('health-a', 'user-a', 'company-a', 'Exame preventivo', 'exame', '2026-07-29', '09:00', 'Levar pedido', 'pending', 0, '2026-07-29T09:00:00.000Z', '2026-07-29T09:00:00.000Z', NULL),
          ('health-b', 'user-b', 'company-a', 'Consulta privada', 'consulta', '2026-07-30', '10:00', 'Outro usuario', 'pending', 0, '2026-07-30T10:00:00.000Z', '2026-07-30T10:00:00.000Z', NULL);

        INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent, granted_at, revoked_at)
        VALUES
          ('consent-a', 'user-a', 'nr1_psychosocial', 1, '203.0.113.10', 'Playwright', '2026-07-29T10:00:00.000Z', NULL),
          ('consent-b', 'user-b', 'nr1_psychosocial', 1, '203.0.113.11', 'Other', '2026-07-29T10:01:00.000Z', NULL);

        INSERT INTO user_uploads (id, user_id, file_path, file_size, category, created_at)
        VALUES
          ('upload-a', 'user-a', '/uploads/avatar-a.png', 1234, 'avatar', '2026-07-29T11:00:00.000Z'),
          ('upload-b', 'user-b', '/uploads/avatar-b.png', 4321, 'avatar', '2026-07-29T11:01:00.000Z');
      `);

      const exported = JSON.parse(Array.from(createDsarExportJsonChunks(db, 'user-a', '2026-07-29T12:00:00.000Z')).join('')) as {
        healthEvents: Array<Record<string, unknown>>;
        userConsents: Array<Record<string, unknown>>;
        userUploads: Array<Record<string, unknown>>;
      };

      expect(exported.healthEvents).toEqual([
        expect.objectContaining({ id: 'health-a', title: 'Exame preventivo', notes: 'Levar pedido' }),
      ]);
      expect(exported.userConsents).toEqual([
        expect.objectContaining({ id: 'consent-a', consent_type: 'nr1_psychosocial', ip_address: '203.0.113.10' }),
      ]);
      expect(exported.userUploads).toEqual([
        expect.objectContaining({ id: 'upload-a', file_path: '/uploads/avatar-a.png', file_size: 1234 }),
      ]);

      const serialized = JSON.stringify(exported);
      expect(serialized).not.toContain('health-b');
      expect(serialized).not.toContain('consent-b');
      expect(serialized).not.toContain('upload-b');
      expect(serialized).not.toContain('user_id');
    } finally {
      db.close();
    }
  });

  it('keeps optional DSAR tables empty when the feature tables are absent', () => {
    const db = createBaseDsarDatabase();
    try {
      const exported = JSON.parse(Array.from(createDsarExportJsonChunks(db, 'user-a', '2026-07-29T12:00:00.000Z')).join('')) as {
        healthEvents: unknown[];
        userConsents: unknown[];
        userUploads: unknown[];
      };

      expect(exported.healthEvents).toEqual([]);
      expect(exported.userConsents).toEqual([]);
      expect(exported.userUploads).toEqual([]);
    } finally {
      db.close();
    }
  });
});
