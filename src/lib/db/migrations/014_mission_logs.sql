CREATE TABLE IF NOT EXISTS mission_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id  TEXT NOT NULL,
  action      TEXT NOT NULL,
  day         TEXT NOT NULL,
  mood        TEXT,
  glasses     INTEGER,
  challenge_id TEXT,
  note        TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mission_logs_user_day ON mission_logs(user_id, day);
