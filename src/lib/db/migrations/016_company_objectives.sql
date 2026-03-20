-- Objetivos e Recompensas definidos pela empresa
CREATE TABLE IF NOT EXISTS company_objectives (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  -- Tipo: weekly (semanal, reseta todo domingo), goal (meta única), campaign (vinculada a campanha)
  type TEXT NOT NULL CHECK(type IN ('weekly', 'goal', 'campaign')),
  -- O que medir: points, missions, level, streak, challenges, campaign_join, campaign_complete
  target_type TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 1,
  -- Para tipo 'campaign'
  campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
  -- Recompensa
  reward_type TEXT NOT NULL CHECK(reward_type IN ('points', 'badge', 'custom')),
  reward_points INTEGER DEFAULT 0,
  reward_badge_id TEXT REFERENCES badges(id) ON DELETE SET NULL,
  reward_custom TEXT,
  -- Vigência
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Progresso individual de cada colaboradora em cada objetivo
CREATE TABLE IF NOT EXISTS user_objective_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES company_objectives(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  completed_at TEXT,
  reward_claimed INTEGER DEFAULT 0,
  reward_claimed_at TEXT,
  -- Para objetivos semanais: 'YYYY-WW' (ex: '2026-12')
  week_key TEXT,
  UNIQUE(user_id, objective_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_company_objectives_company ON company_objectives(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_objective_progress_user ON user_objective_progress(user_id, objective_id);
