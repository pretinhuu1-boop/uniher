CREATE TABLE IF NOT EXISTS dsar_export_cooldowns (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  next_allowed_at INTEGER NOT NULL CHECK(next_allowed_at >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
