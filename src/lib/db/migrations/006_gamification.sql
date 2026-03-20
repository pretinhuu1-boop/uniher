-- ============================================
-- 006: Gamification — leagues, daily missions, streak freezes
-- ============================================

-- Ligas semanais (Bronze → Prata → Ouro → Safira → Rubi → Esmeralda → Diamante)
CREATE TABLE IF NOT EXISTS user_leagues (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league TEXT NOT NULL DEFAULT 'bronze' CHECK(league IN ('bronze','prata','ouro','safira','rubi','esmeralda','diamante')),
  week_points INTEGER DEFAULT 0,
  week_start TEXT NOT NULL, -- ISO date of Monday of current week
  rank INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_user_leagues_week ON user_leagues(week_start, league, week_points DESC);

-- Missoes diarias (geradas por dia para cada usuaria)
CREATE TABLE IF NOT EXISTS daily_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp INTEGER DEFAULT 20,
  category TEXT NOT NULL,
  action TEXT NOT NULL, -- 'check_in' | 'complete_challenge' | 'drink_water' | etc
  day TEXT NOT NULL, -- ISO date YYYY-MM-DD
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_day ON daily_missions(user_id, day);

-- Streak freezes (protecao de sequencia)
CREATE TABLE IF NOT EXISTS streak_freezes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

-- Meta diaria de XP por usuario
ALTER TABLE users ADD COLUMN daily_xp_goal INTEGER DEFAULT 20;
ALTER TABLE users ADD COLUMN daily_xp_earned INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN daily_xp_date TEXT; -- last date XP was reset
ALTER TABLE users ADD COLUMN league TEXT DEFAULT 'bronze';
