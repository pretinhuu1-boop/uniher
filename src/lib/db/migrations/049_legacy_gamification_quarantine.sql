CREATE TABLE IF NOT EXISTS legacy_privacy_quarantine (
  domain TEXT NOT NULL,
  record_table TEXT NOT NULL,
  record_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  quarantined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (domain, record_table, record_key)
);

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'league', 'user_leagues', id, 'eligible_ledger_required' FROM user_leagues;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'league', 'custom_league_members', id, 'eligible_ledger_required' FROM custom_league_members;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'badge', 'user_badges', user_id || ':' || badge_id, 'persisted_classification_required' FROM user_badges;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'mission', 'daily_missions', id, 'eligible_ledger_required' FROM daily_missions;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'mission', 'mission_logs', id, 'eligible_ledger_required' FROM mission_logs;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'activity', 'activity_log', id, 'eligible_ledger_required' FROM activity_log;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'notification', 'notifications', id, 'legacy_gamification_notification'
FROM notifications WHERE type IN ('badge', 'level', 'streak', 'gamification', 'reward');

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'user_score', 'users', id, 'eligible_ledger_required'
FROM users WHERE points <> 0 OR level <> 0;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'health_derived', 'health_scores', id, 'legacy_health_derivation_review' FROM health_scores;

INSERT OR IGNORE INTO audit_logs (
  id, actor_id, actor_email, actor_role, action, entity_type, entity_id, entity_label, details, ip
)
SELECT
  'migration_049_legacy_gamification_quarantine',
  NULL,
  'system@uniher.local',
  'system',
  'legacy_gamification_quarantine',
  'privacy_quarantine',
  NULL,
  'Legacy gamification quarantine',
  '{"count":' || (SELECT COUNT(*) FROM legacy_privacy_quarantine) || '}',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs WHERE id = 'migration_049_legacy_gamification_quarantine'
);
