ALTER TABLE user_exams ADD COLUMN source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_user_exams_source ON user_exams(user_id, source);
