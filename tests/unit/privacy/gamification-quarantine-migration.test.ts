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
    CREATE TABLE company_objectives (id TEXT PRIMARY KEY, company_id TEXT, title TEXT);
    CREATE TABLE user_objective_progress (id TEXT PRIMARY KEY, user_id TEXT, objective_id TEXT);
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE user_challenges (user_id TEXT, challenge_id TEXT, progress INTEGER, PRIMARY KEY (user_id, challenge_id));
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
    INSERT INTO company_objectives VALUES ('objective-1', 'company-1', 'Objetivo legado');
    INSERT INTO user_objective_progress VALUES ('objective-progress-1', 'user-1', 'objective-1');
    INSERT INTO challenges VALUES ('challenge-1', 'Desafio legado');
    INSERT INTO user_challenges VALUES ('user-1', 'challenge-1', 1);
  `);
  return db;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('migration 055 objective and challenge quarantine expansion', () => {
  it('preserves legacy rows, marks all omitted domains and records one count-only receipt', () => {
    const db = createLegacyDatabase();
    const migrationDir = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');
    const migration049 = fs.readFileSync(path.join(migrationDir, '049_legacy_gamification_quarantine.sql'), 'utf8');
    const migration055 = fs.readFileSync(path.join(migrationDir, '055_legacy_objective_challenge_quarantine.sql'), 'utf8');
    const before = {
      objectives: db.prepare('SELECT * FROM company_objectives').all(),
      objectiveProgress: db.prepare('SELECT * FROM user_objective_progress').all(),
      challenges: db.prepare('SELECT * FROM challenges').all(),
      challengeProgress: db.prepare('SELECT * FROM user_challenges').all(),
    };

    expect(applyMigration(db, '049_legacy_gamification_quarantine.sql', migration049)).toBe('applied');
    expect(applyMigration(db, '055_legacy_objective_challenge_quarantine.sql', migration055)).toBe('applied');
    expect(applyMigration(db, '055_legacy_objective_challenge_quarantine.sql', migration055)).toBe('skipped');

    expect(db.prepare('SELECT * FROM company_objectives').all()).toEqual(before.objectives);
    expect(db.prepare('SELECT * FROM user_objective_progress').all()).toEqual(before.objectiveProgress);
    expect(db.prepare('SELECT * FROM challenges').all()).toEqual(before.challenges);
    expect(db.prepare('SELECT * FROM user_challenges').all()).toEqual(before.challengeProgress);

    const markers = db.prepare(`
      SELECT domain, record_table, record_key, reason
      FROM legacy_privacy_quarantine
      WHERE domain IN ('objective', 'objective_progress', 'challenge', 'challenge_progress')
      ORDER BY domain
    `).all();
    expect(markers).toEqual([
      { domain: 'challenge', record_table: 'challenges', record_key: 'challenge-1', reason: 'legacy_contract_not_eligible' },
      { domain: 'challenge_progress', record_table: 'user_challenges', record_key: 'user-1:challenge-1', reason: 'legacy_contract_not_eligible' },
      { domain: 'objective', record_table: 'company_objectives', record_key: 'objective-1', reason: 'legacy_contract_not_eligible' },
      { domain: 'objective_progress', record_table: 'user_objective_progress', record_key: 'objective-progress-1', reason: 'legacy_contract_not_eligible' },
    ]);

    const receipt = db.prepare(`
      SELECT action, details FROM audit_logs
      WHERE id = 'migration_055_legacy_objective_challenge_quarantine'
    `).get() as { action: string; details: string };
    expect(receipt.action).toBe('legacy_objective_challenge_quarantine');
    expect(receipt.details).toBe('{"count":4}');
    expect(receipt.details).not.toMatch(/user-1|objective-1|challenge-1/);
  });

  it('keeps legacy seeds and operational counters disconnected from quarantined domains', () => {
    const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

    expect(read('src/lib/db/seed.ts')).not.toMatch(/INSERT[\s\S]+?INTO\s+(?:badges|challenges)/i);
    expect(read('src/app/api/admin/system/route.ts')).not.toMatch(/FROM\s+(?:badges|challenges)/i);
    expect(read('src/app/api/rh/onboarding-status/route.ts')).not.toMatch(/FROM\s+challenges/i);
    expect(read('src/app/(platform)/onboarding-rh/page.tsx')).not.toMatch(/key:\s*['"]challenges['"]/i);
  });
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
