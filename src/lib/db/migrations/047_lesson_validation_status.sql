ALTER TABLE daily_lessons ADD COLUMN validated_at TEXT;
ALTER TABLE daily_lessons ADD COLUMN validated_by TEXT;
ALTER TABLE daily_lessons ADD COLUMN validation_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_lessons_validated_at
  ON daily_lessons(validated_at, week_number, day_of_week);
