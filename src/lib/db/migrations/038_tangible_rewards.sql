-- Migration 038: tangible_rewards (recompensas tangiveis)
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  type TEXT DEFAULT 'voucher', -- voucher, folga, produto, experiencia
  quantity_available INTEGER DEFAULT -1, -- -1 = unlimited
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, delivered, rejected
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

CREATE INDEX IF NOT EXISTS idx_rewards_company ON rewards(company_id, active);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON reward_redemptions(status, created_at);
