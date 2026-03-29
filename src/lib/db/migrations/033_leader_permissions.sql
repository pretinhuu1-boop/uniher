-- Permissão: líder pode aprovar colaboradoras do seu setor
-- Configurável por empresa pelo admin
ALTER TABLE users ADD COLUMN can_approve INTEGER DEFAULT 0;

-- Configuração por empresa: se líderes podem aprovar
-- 0 = só admin aprova, 1 = líder do setor pode aprovar
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, setting_key)
);
