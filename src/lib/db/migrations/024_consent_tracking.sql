CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  granted_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id);
