-- ============================================
-- UniHER - Schema Completo SQLite
-- Adaptado de docs/plans/2026-03-14-uniher-schema.md
-- ============================================

-- 1. Empresas
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT UNIQUE NOT NULL,
  sector TEXT,
  plan TEXT DEFAULT 'trial' CHECK(plan IN ('trial', 'pro', 'enterprise')),
  logo_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Departamentos
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3E7D5A',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);

-- 3. Usuarios
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id),
  department_id TEXT REFERENCES departments(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'rh', 'lideranca', 'colaboradora')),
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_active TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 5. Arquetipos
CREATE TABLE IF NOT EXISTS archetypes (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_scores TEXT NOT NULL,       -- JSON array de 6 scores
  growth_30 TEXT NOT NULL,         -- JSON array
  growth_60 TEXT NOT NULL,         -- JSON array
  growth_90 TEXT NOT NULL,         -- JSON array
  missions INTEGER DEFAULT 0,
  campaigns INTEGER DEFAULT 0,
  habits INTEGER DEFAULT 0
);

-- 6. Resultados do Quiz
CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  archetype_id TEXT REFERENCES archetypes(id),
  answers_json TEXT NOT NULL,      -- JSON com todas respostas
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_results(user_id);

-- 7. Badges
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 8. User Badges (N:N)
CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- 9. Desafios
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 1,
  deadline TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 10. User Challenges (N:N)
CREATE TABLE IF NOT EXISTS user_challenges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'locked')),
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);

-- 11. Campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  month TEXT NOT NULL,
  color TEXT NOT NULL,
  status TEXT DEFAULT 'next' CHECK(status IN ('done', 'active', 'next')),
  status_label TEXT,
  company_id TEXT REFERENCES companies(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 12. User Campaigns (N:N)
CREATE TABLE IF NOT EXISTS user_campaigns (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_user_campaigns_user ON user_campaigns(user_id);

-- 13. Notificacoes
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('badge', 'level', 'campaign', 'challenge', 'alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);

-- 14. Health Scores (Semaforo)
CREATE TABLE IF NOT EXISTS health_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL,
  score REAL NOT NULL,
  status TEXT CHECK(status IN ('green', 'yellow', 'red')),
  recorded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_health_scores_user ON health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_latest ON health_scores(user_id, dimension, recorded_at);

-- 15. Leads (pre-cadastro, independente)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  archetype TEXT,
  consent INTEGER DEFAULT 0,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- 16. Convites
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'colaboradora' CHECK(role IN ('rh', 'lideranca', 'colaboradora')),
  department_id TEXT REFERENCES departments(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'expired')),
  invited_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_company ON invites(company_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);

-- 17. Configuracao de Relatorios
CREATE TABLE IF NOT EXISTS report_configs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('weekly', 'monthly')),
  label TEXT NOT NULL,
  description TEXT,
  schedule TEXT,
  enabled INTEGER DEFAULT 1,
  recipient_email TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_report_configs_company ON report_configs(company_id);

-- 18. Log de Atividades (para streak e engajamento)
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- 19. Exames da Colaboradora
CREATE TABLE IF NOT EXISTS user_exams (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'overdue')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_exams_user ON user_exams(user_id);
