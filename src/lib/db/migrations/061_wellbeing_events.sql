CREATE TABLE IF NOT EXISTS wellbeing_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('check_in', 'check_out')),
  mood TEXT NOT NULL CHECK (
    mood IN ('muito_bem', 'bem', 'neutra', 'cansada', 'sobrecarregada', 'nao_informado')
  ),
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, event_type, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wellbeing_events_user_day
  ON wellbeing_events(user_id, day, event_type);

CREATE INDEX IF NOT EXISTS idx_wellbeing_events_company_day
  ON wellbeing_events(company_id, day, event_type);
