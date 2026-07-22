CREATE TABLE IF NOT EXISTS private_achievements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK(status IN ('in_progress', 'earned', 'revoked')),
  progress INTEGER NOT NULL DEFAULT 0
    CHECK(progress >= 0 AND progress <= 100),
  earned_event_id TEXT REFERENCES eligible_participation_events(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  earned_at TEXT,
  revoked_at TEXT,
  UNIQUE(company_id, user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_private_achievements_user_status
  ON private_achievements(company_id, user_id, status, updated_at DESC);
