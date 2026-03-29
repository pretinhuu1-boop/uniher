-- Migration 040: streak_history (historico de sequencias)
CREATE TABLE IF NOT EXISTS streak_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  streak_count INTEGER NOT NULL,
  lost_at TEXT,
  reason TEXT, -- missed_day, manual_reset
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_streak_user ON streak_history(user_id, created_at DESC);
