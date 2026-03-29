-- Agenda de saúde (exames, consultas, lembretes)
CREATE TABLE IF NOT EXISTS health_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('exame', 'consulta', 'lembrete')),
  date TEXT NOT NULL,
  time TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled', 'missed')),
  reminder_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_events_user ON health_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_health_events_company ON health_events(company_id, date);
CREATE INDEX IF NOT EXISTS idx_health_events_reminder ON health_events(date, reminder_sent, status);

-- Configuração de alertas por gestor/admin
CREATE TABLE IF NOT EXISTS alert_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK(alert_type IN ('exame', 'consulta', 'lembrete', 'all')),
  days_before INTEGER DEFAULT 3,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, alert_type)
);
