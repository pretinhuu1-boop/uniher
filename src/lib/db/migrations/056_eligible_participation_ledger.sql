CREATE TABLE IF NOT EXISTS eligible_participation_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  mutation_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'content_completed',
    'objective_started',
    'objective_progressed',
    'objective_completed',
    'challenge_joined',
    'challenge_progressed',
    'challenge_completed',
    'challenge_left'
  )),
  source_domain TEXT NOT NULL CHECK(source_domain IN (
    'content',
    'personal_objective',
    'company_challenge'
  )),
  source_id TEXT NOT NULL,
  eligibility_version TEXT NOT NULL DEFAULT 'participation-v1'
    CHECK(eligibility_version = 'participation-v1'),
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK(metadata_json = '{}'),
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (event_type = 'content_completed' AND source_domain = 'content')
    OR (event_type IN ('objective_started', 'objective_progressed', 'objective_completed')
      AND source_domain = 'personal_objective')
    OR (event_type IN ('challenge_joined', 'challenge_progressed', 'challenge_completed', 'challenge_left')
      AND source_domain = 'company_challenge')
  )
);

CREATE INDEX IF NOT EXISTS idx_participation_events_company_user_occurred
  ON eligible_participation_events(company_id, user_id, occurred_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_participation_events_source
  ON eligible_participation_events(company_id, source_domain, source_id);

CREATE TABLE IF NOT EXISTS eligible_participation_event_revocations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES eligible_participation_events(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL CHECK(reason_code IN (
    'source_reversed',
    'source_deleted',
    'eligibility_error',
    'user_erasure'
  )),
  actor_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  revoked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, version)
);

CREATE INDEX IF NOT EXISTS idx_participation_revocations_event
  ON eligible_participation_event_revocations(event_id);

CREATE TABLE IF NOT EXISTS participation_erasure_receipts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  event_count INTEGER NOT NULL CHECK(event_count >= 0),
  erased_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_participation_erasure_receipts_company_erased
  ON participation_erasure_receipts(company_id, erased_at DESC);
