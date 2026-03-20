-- ============================================
-- 007: Company-scoped challenges + custom leagues
-- ============================================

-- Add company scope + lifecycle columns to challenges
ALTER TABLE challenges ADD COLUMN company_id TEXT REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE challenges ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE challenges ADD COLUMN is_default INTEGER DEFAULT 0;   -- 1 = platform default
ALTER TABLE challenges ADD COLUMN is_active INTEGER DEFAULT 1;    -- 0 = deactivated by RH
ALTER TABLE challenges ADD COLUMN overridden_from TEXT;           -- id of default challenge this was forked from
ALTER TABLE challenges ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Custom (opt-in) leagues created by RH
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

-- Members of custom leagues
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
