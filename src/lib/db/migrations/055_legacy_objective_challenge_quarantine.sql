INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'objective', 'company_objectives', id, 'legacy_contract_not_eligible' FROM company_objectives;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'objective_progress', 'user_objective_progress', id, 'legacy_contract_not_eligible'
FROM user_objective_progress;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'challenge', 'challenges', id, 'legacy_contract_not_eligible' FROM challenges;

INSERT OR IGNORE INTO legacy_privacy_quarantine (domain, record_table, record_key, reason)
SELECT 'challenge_progress', 'user_challenges', user_id || ':' || challenge_id,
       'legacy_contract_not_eligible'
FROM user_challenges;

INSERT OR IGNORE INTO audit_logs (
  id, actor_id, actor_email, actor_role, action, entity_type, entity_id, entity_label, details, ip
)
SELECT
  'migration_055_legacy_objective_challenge_quarantine',
  NULL,
  'system@uniher.local',
  'system',
  'legacy_objective_challenge_quarantine',
  'privacy_quarantine',
  NULL,
  'Legacy objective and challenge quarantine',
  '{"count":' || (
    SELECT COUNT(*) FROM legacy_privacy_quarantine
    WHERE domain IN ('objective', 'objective_progress', 'challenge', 'challenge_progress')
  ) || '}',
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs
  WHERE id = 'migration_055_legacy_objective_challenge_quarantine'
);
