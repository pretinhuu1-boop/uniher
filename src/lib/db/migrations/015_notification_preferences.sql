CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reminder_times   TEXT NOT NULL DEFAULT '["08:00","18:00"]',
  mission_reminders TEXT NOT NULL DEFAULT '{"check_in":true,"drink_water":true,"complete_challenge":true,"update_semaforo":true}',
  browser_enabled  INTEGER NOT NULL DEFAULT 0,
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS company_alert_settings (
  company_id               TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  reminder_times           TEXT NOT NULL DEFAULT '["09:00"]',
  auto_reminders_enabled   INTEGER NOT NULL DEFAULT 0,
  updated_at               TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_alerts (
  id               TEXT PRIMARY KEY,
  company_id       TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sent_by          TEXT NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_company ON admin_alerts(company_id);
