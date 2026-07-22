CREATE TABLE IF NOT EXISTS company_challenge_catalog (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('content_items', 'sessions', 'days')),
  target INTEGER NOT NULL CHECK(target >= 1 AND target <= 365),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_company_challenges (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_key TEXT NOT NULL REFERENCES company_challenge_catalog(key),
  status TEXT NOT NULL DEFAULT 'joined'
    CHECK(status IN ('joined', 'completed', 'left')),
  progress INTEGER NOT NULL DEFAULT 0
    CHECK(progress >= 0 AND progress <= 100),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  left_at TEXT,
  UNIQUE(company_id, user_id, catalog_key)
);

CREATE INDEX IF NOT EXISTS idx_user_company_challenges_user_status
  ON user_company_challenges(company_id, user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_company_challenges_catalog_status
  ON user_company_challenges(company_id, catalog_key, status);

INSERT OR IGNORE INTO company_challenge_catalog (
  key, title, description, mode, target, starts_at, ends_at, is_active
) VALUES
  (
    'learning-sprint',
    'Sprint de aprendizagem',
    'Concluir conteudos educativos selecionados pela empresa, sem pontuacao ou ranking.',
    'content_items',
    3,
    '2026-01-01T00:00:00.000Z',
    '2027-12-31T23:59:59.999Z',
    1
  ),
  (
    'focus-sessions',
    'Sessoes de foco',
    'Reservar momentos de foco para organizar prioridades de trabalho.',
    'sessions',
    4,
    '2026-01-01T00:00:00.000Z',
    '2027-12-31T23:59:59.999Z',
    1
  ),
  (
    'weekly-routine',
    'Rotina semanal segura',
    'Manter uma rotina simples de revisao semanal sem informar dados sensiveis.',
    'days',
    5,
    '2026-01-01T00:00:00.000Z',
    '2027-12-31T23:59:59.999Z',
    1
  );
