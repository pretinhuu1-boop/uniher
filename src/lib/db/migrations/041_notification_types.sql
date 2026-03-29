-- Add streak, gamification, reward, lesson notification types
-- SQLite doesn't support ALTER CHECK, so we recreate the table

CREATE TABLE IF NOT EXISTS notifications_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('badge', 'level', 'campaign', 'challenge', 'alert', 'streak', 'gamification', 'reward', 'lesson', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO notifications_new SELECT * FROM notifications;

DROP TABLE IF EXISTS notifications;

ALTER TABLE notifications_new RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
