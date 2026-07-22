CREATE TABLE IF NOT EXISTS personal_objectives (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'completed', 'archived')),
  progress INTEGER NOT NULL DEFAULT 0
    CHECK(progress >= 0 AND progress <= 100),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  archived_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_objectives_active_template
  ON personal_objectives(company_id, user_id, template_key)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_personal_objectives_user_status
  ON personal_objectives(company_id, user_id, status, updated_at DESC);
