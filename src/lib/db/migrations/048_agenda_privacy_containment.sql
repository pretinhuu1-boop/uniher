-- Remove historical manager Agenda disclosures and add explicit reminder provenance.

INSERT INTO audit_logs (
  id, actor_email, actor_role, action, entity_type, entity_id, details
)
SELECT
  'migration_048_agenda_privacy_containment',
  'system@uniher.local',
  'system',
  'agenda_privacy_containment',
  'notifications',
  'migration_048',
  'manager_notifications_deleted=' || (
    SELECT COUNT(*)
    FROM notifications n
    JOIN users u ON u.id = n.user_id
    WHERE u.role IN ('rh', 'lideranca', 'admin')
      AND (
        (n.type = 'alert' AND (
          n.title LIKE 'Exame de colaboradora em %'
          OR n.title LIKE 'Consulta de colaboradora em %'
          OR n.title LIKE 'Lembrete de colaboradora em %'
        ))
        OR (n.type = 'system' AND n.title IN ('Exame agendada', 'Consulta agendada'))
      )
  ) || ';manager_preferences_deleted=' || (
    SELECT COUNT(*)
    FROM alert_preferences ap
    JOIN users u ON u.id = ap.user_id
    WHERE u.role IN ('rh', 'lideranca', 'admin')
  );

DELETE FROM alert_preferences
WHERE user_id IN (
  SELECT id FROM users WHERE role IN ('rh', 'lideranca', 'admin')
);

DELETE FROM notifications
WHERE user_id IN (
  SELECT id FROM users WHERE role IN ('rh', 'lideranca', 'admin')
)
AND (
  (type = 'alert' AND (
    title LIKE 'Exame de colaboradora em %'
    OR title LIKE 'Consulta de colaboradora em %'
    OR title LIKE 'Lembrete de colaboradora em %'
  ))
  OR (type = 'system' AND title IN ('Exame agendada', 'Consulta agendada'))
);

CREATE TABLE notifications_agenda_contained (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN (
    'badge', 'level', 'campaign', 'challenge', 'alert', 'streak',
    'gamification', 'reward', 'lesson', 'system', 'reminder'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  source TEXT,
  resource_id TEXT
);

INSERT INTO notifications_agenda_contained (
  id, user_id, type, title, message, read, created_at, source, resource_id
)
SELECT
  id, user_id, type, title, message, read, created_at, NULL AS source, NULL AS resource_id
FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_agenda_contained RENAME TO notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
