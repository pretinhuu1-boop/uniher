-- Migration 039: gamification_config (configuracao por empresa)
CREATE TABLE IF NOT EXISTS gamification_config (
  company_id TEXT PRIMARY KEY,
  xp_checkin INTEGER DEFAULT 50,
  xp_lesson INTEGER DEFAULT 20,
  xp_quiz INTEGER DEFAULT 30,
  xp_challenge INTEGER DEFAULT 40,
  xp_exam INTEGER DEFAULT 100,
  streak_notifications INTEGER DEFAULT 1,
  streak_min_days INTEGER DEFAULT 3,
  hearts_enabled INTEGER DEFAULT 0,
  hearts_per_day INTEGER DEFAULT 5,
  hearts_refill_hours INTEGER DEFAULT 24,
  league_enabled INTEGER DEFAULT 1,
  league_anonymous INTEGER DEFAULT 0,
  daily_xp_goal INTEGER DEFAULT 50,
  active_themes TEXT DEFAULT '["hidratacao","sono","prevencao","nutricao","mental","ciclo"]',
  theme_order TEXT DEFAULT '["hidratacao","sono","prevencao","nutricao","mental","ciclo"]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
