-- Migration 037: hearts_system (sistema de vidas estilo Duolingo)
CREATE TABLE IF NOT EXISTS user_hearts (
  user_id TEXT PRIMARY KEY,
  hearts INTEGER DEFAULT 5,
  max_hearts INTEGER DEFAULT 5,
  last_refill TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
