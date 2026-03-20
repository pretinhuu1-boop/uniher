-- ============================================
-- 009: Create custom_leagues and custom_league_members tables
-- (007 partially failed — column adds ran but CREATE TABLE was skipped)
-- ============================================

CREATE TABLE IF NOT EXISTS custom_leagues (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'opt_in' CHECK(type IN ('opt_in', 'department', 'company')),
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '🏆',
  color TEXT DEFAULT '#C8547E',
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_league_members (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES custom_leagues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_points INTEGER DEFAULT 0,
  week_start TEXT NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(league_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_custom_leagues_company ON custom_leagues(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_league_members_league ON custom_league_members(league_id, week_start, week_points DESC);
CREATE INDEX IF NOT EXISTS idx_custom_league_members_user ON custom_league_members(user_id);
