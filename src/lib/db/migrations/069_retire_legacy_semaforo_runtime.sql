-- Retire ephemeral consumers of the former six-dimension Semaforo.
-- Clinical history in health_scores remains intact for LGPD export only.
DELETE FROM daily_missions
WHERE action = 'update_semaforo';

UPDATE notification_preferences
SET mission_reminders = json_remove(mission_reminders, '$.update_semaforo')
WHERE json_valid(mission_reminders);
