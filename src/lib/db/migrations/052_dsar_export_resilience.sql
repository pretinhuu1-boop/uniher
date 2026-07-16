ALTER TABLE dsar_export_cooldowns ADD COLUMN reservation_token TEXT;
ALTER TABLE dsar_export_cooldowns ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'
  CHECK(status IN ('in_progress', 'completed', 'failed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_dsar_notifications_user_created_at
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_activity_log_user_created_at
  ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_mission_logs_user_created_at
  ON mission_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_health_scores_user_recorded_at
  ON health_scores(user_id, recorded_at DESC);
