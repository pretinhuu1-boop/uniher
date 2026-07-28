CREATE TABLE IF NOT EXISTS personal_semaforo_consents (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  retention_days INTEGER NOT NULL DEFAULT 180,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personal_semaforo_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT,
  signal TEXT NOT NULL CHECK (signal IN ('green', 'yellow', 'red')),
  energy TEXT NOT NULL CHECK (energy IN ('low', 'steady', 'high')),
  note TEXT,
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_personal_semaforo_entries_user_created
ON personal_semaforo_entries(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_personal_semaforo_entries_expiry
ON personal_semaforo_entries(expires_at)
WHERE deleted_at IS NULL;
