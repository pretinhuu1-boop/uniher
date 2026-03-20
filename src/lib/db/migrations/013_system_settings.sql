CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default UniHER branding
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('app_name', 'UniHER');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('app_logo_url', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('primary_color', '#F43F5E');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('secondary_color', '#B8922A');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('accent_color', '#EAB8CB');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('support_email', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('support_phone', '');
