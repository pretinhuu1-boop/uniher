import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';

const databases: Database.Database[] = [];

function createLegacyDatabase() {
  const db = new Database(':memory:');
  databases.push(db);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, points INTEGER NOT NULL, level INTEGER NOT NULL);
    CREATE TABLE user_leagues (id TEXT PRIMARY KEY, user_id TEXT, league TEXT, week_points INTEGER);
    CREATE TABLE custom_league_members (id TEXT PRIMARY KEY, league_id TEXT, user_id TEXT, week_points INTEGER);
    CREATE TABLE user_badges (id TEXT PRIMARY KEY, user_id TEXT, badge_id TEXT, earned_at TEXT);
    CREATE TABLE daily_missions (id TEXT PRIMARY KEY, action TEXT, points INTEGER);
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, points_earned INTEGER);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, points INTEGER);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, score INTEGER, level TEXT);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT);
    CREATE TABLE audit_logs (
      id TEXT PRIMARY KEY, actor_id TEXT, actor_email TEXT NOT NULL, actor_role TEXT NOT NULL,
      action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, entity_label TEXT, details TEXT,
      ip TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users VALUES ('user-1', 73, 4);
    INSERT INTO user_leagues VALUES ('ul-1', 'user-1', 'gold', 31);
    INSERT INTO custom_league_members VALUES ('clm-1', 'league-1', 'user-1', 29);
    INSERT INTO user_badges VALUES ('ub-1', 'user-1', 'badge-1', '2026-01-01');
    INSERT INTO daily_missions VALUES ('dm-1', 'check_in', 10);
    INSERT INTO mission_logs VALUES ('ml-1', 'user-1', 'dm-1', 10);
    INSERT INTO activity_log VALUES ('al-1', 'user-1', 'check_in', 10);
    INSERT INTO health_scores VALUES ('hs-1', 'user-1', 88, 'green');
    INSERT INTO notifications VALUES ('n-1', 'user-1', 'badge', 'Conquista', 'Você ganhou um badge');
  `);
  return db;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('migration 049 preservation-first quarantine', () => {
  it('preserves every canary value, marks every legacy domain and records one count-only receipt', () => {
    const db = createLegacyDatabase();
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '049_legacy_gamification_quarantine.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const before = {
      users: db.prepare('SELECT * FROM users').all(),
      userLeagues: db.prepare('SELECT * FROM user_leagues').all(),
      customMembers: db.prepare('SELECT * FROM custom_league_members').all(),
      badges: db.prepare('SELECT * FROM user_badges').all(),
      missions: db.prepare('SELECT * FROM daily_missions').all(),
      logs: db.prepare('SELECT * FROM mission_logs').all(),
      activity: db.prepare('SELECT * FROM activity_log').all(),
      health: db.prepare('SELECT * FROM health_scores').all(),
    };

    expect(applyMigration(db, '049_legacy_gamification_quarantine.sql', sql)).toBe('applied');
    expect(applyMigration(db, '049_legacy_gamification_quarantine.sql', sql)).toBe('skipped');

    expect(db.prepare('SELECT * FROM users').all()).toEqual(before.users);
    expect(db.prepare('SELECT * FROM user_leagues').all()).toEqual(before.userLeagues);
    expect(db.prepare('SELECT * FROM custom_league_members').all()).toEqual(before.customMembers);
    expect(db.prepare('SELECT * FROM user_badges').all()).toEqual(before.badges);
    expect(db.prepare('SELECT * FROM daily_missions').all()).toEqual(before.missions);
    expect(db.prepare('SELECT * FROM mission_logs').all()).toEqual(before.logs);
    expect(db.prepare('SELECT * FROM activity_log').all()).toEqual(before.activity);
    expect(db.prepare('SELECT * FROM health_scores').all()).toEqual(before.health);

    const markers = db.prepare(`
      SELECT domain, record_table, record_key, reason
      FROM legacy_privacy_quarantine ORDER BY domain, record_table, record_key
    `).all() as Array<{ domain: string; record_table: string; record_key: string; reason: string }>;
    expect(new Set(markers.map(({ domain }) => domain))).toEqual(new Set([
      'activity', 'badge', 'health_derived', 'league', 'mission', 'notification', 'user_score',
    ]));
    expect(markers).toHaveLength(9);

    const receipts = db.prepare(`
      SELECT actor_email, actor_role, action, details FROM audit_logs
      WHERE id = 'migration_049_legacy_gamification_quarantine'
    `).all() as Array<{ actor_email: string; actor_role: string; action: string; details: string }>;
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      actor_email: 'system@uniher.local', actor_role: 'system', action: 'legacy_gamification_quarantine',
    });
    expect(receipts[0].details).not.toMatch(/user-1|Ana|Conquista|badge-1/);
    expect(receipts[0].details).toMatch(/count/i);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ledger%'").all()).toEqual([]);
  });
});
