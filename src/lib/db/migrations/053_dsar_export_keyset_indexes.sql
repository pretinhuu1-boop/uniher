CREATE INDEX IF NOT EXISTS idx_dsar_notifications_user_created_at_keyset
  ON notifications(user_id, COALESCE(created_at, '') DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_activity_log_user_created_at_keyset
  ON activity_log(user_id, COALESCE(created_at, '') DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_mission_logs_user_created_at_keyset
  ON mission_logs(user_id, COALESCE(created_at, '') DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dsar_health_scores_user_recorded_at_keyset
  ON health_scores(user_id, COALESCE(recorded_at, '') DESC, id DESC);
