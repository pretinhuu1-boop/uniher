-- Expande histórico de alertas para suportar empresa, departamento, perfil e tipo de notificação.

CREATE TABLE IF NOT EXISTS admin_alerts_new (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  target_role TEXT,
  notification_type TEXT NOT NULL DEFAULT 'alert',
  audience_label TEXT,
  sent_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO admin_alerts_new (
  id,
  company_id,
  department_id,
  target_role,
  notification_type,
  audience_label,
  sent_by,
  title,
  message,
  recipients_count,
  created_at
)
SELECT
  id,
  CASE WHEN company_id = 'all' THEN NULL ELSE company_id END,
  NULL,
  NULL,
  'alert',
  CASE WHEN company_id = 'all' THEN 'Todas as empresas' ELSE NULL END,
  sent_by,
  title,
  message,
  recipients_count,
  created_at
FROM admin_alerts;

DROP TABLE IF EXISTS admin_alerts;

ALTER TABLE admin_alerts_new RENAME TO admin_alerts;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_company ON admin_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_department ON admin_alerts(department_id);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_role ON admin_alerts(target_role);
