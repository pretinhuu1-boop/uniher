-- Rebuild the notification preferences table so databases that already applied
-- migration 015 receive the contained default and sanitized legacy values.

CREATE TABLE notification_preferences_semaforo_contained (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reminder_times TEXT NOT NULL DEFAULT '["08:00","18:00"]',
  mission_reminders TEXT NOT NULL DEFAULT '{"check_in":true,"drink_water":true,"complete_challenge":true}',
  browser_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO notification_preferences_semaforo_contained (
  user_id,
  reminder_times,
  mission_reminders,
  browser_enabled,
  updated_at
)
SELECT
  user_id,
  reminder_times,
  CASE
    WHEN mission_reminders IS NULL OR json_valid(mission_reminders) = 0 THEN '{}'
    WHEN json_type(mission_reminders) <> 'object' THEN '{}'
    ELSE json_patch(
      json_patch(
        json_patch(
          json_patch(
            '{}',
            CASE json_type(mission_reminders, '$.read_content')
              WHEN 'true' THEN '{"read_content":true}'
              WHEN 'false' THEN '{"read_content":false}'
              ELSE '{}'
            END
          ),
          CASE json_type(mission_reminders, '$.check_in')
            WHEN 'true' THEN '{"check_in":true}'
            WHEN 'false' THEN '{"check_in":false}'
            ELSE '{}'
          END
        ),
        CASE json_type(mission_reminders, '$.drink_water')
          WHEN 'true' THEN '{"drink_water":true}'
          WHEN 'false' THEN '{"drink_water":false}'
          ELSE '{}'
        END
      ),
      CASE json_type(mission_reminders, '$.complete_challenge')
        WHEN 'true' THEN '{"complete_challenge":true}'
        WHEN 'false' THEN '{"complete_challenge":false}'
        ELSE '{}'
      END
    )
  END,
  browser_enabled,
  updated_at
FROM notification_preferences;

DROP TABLE notification_preferences;
ALTER TABLE notification_preferences_semaforo_contained RENAME TO notification_preferences;
