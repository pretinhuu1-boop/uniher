CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pref_key TEXT NOT NULL,
  pref_value TEXT NOT NULL DEFAULT '1',
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, pref_key)
);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
