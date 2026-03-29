-- Migration 035: daily_lessons (jornada diaria de aprendizado)
CREATE TABLE IF NOT EXISTS daily_lessons (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'pilula', -- pilula, quiz, desafio, reflexao
  theme TEXT NOT NULL DEFAULT 'geral', -- hidratacao, sono, prevencao, nutricao, mental, ciclo, geral
  content_json TEXT, -- JSON with lesson content (questions, tips, etc)
  xp_reward INTEGER DEFAULT 20,
  duration_seconds INTEGER DEFAULT 30,
  week_number INTEGER DEFAULT 1,
  day_of_week INTEGER DEFAULT 1, -- 1=mon 7=sun
  order_index INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_lessons_company ON daily_lessons(company_id, week_number, day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_lessons_theme ON daily_lessons(theme, active);
