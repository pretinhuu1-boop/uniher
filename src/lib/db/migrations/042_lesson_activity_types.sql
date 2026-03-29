-- Migration 042: extend daily_lessons with new activity types
-- New types supported: lacuna, verdadeiro_falso, ordenar, parear, historia, flashcard, imagem, desafio_dia
-- The type column is TEXT with no CHECK constraint, so new values are immediately valid.
-- The content_json column already exists (added in migration 035) and stores structured JSON per activity type.

-- Add type_version column to track content schema evolution (nullable for backwards compat)
-- SQLite does not support IF NOT EXISTS on ALTER TABLE, so this will fail gracefully if already applied
-- The migration runner tracks applied files so this runs exactly once.
ALTER TABLE daily_lessons ADD COLUMN type_version INTEGER DEFAULT 1;

-- Index to support efficient filtering by activity type
CREATE INDEX IF NOT EXISTS idx_daily_lessons_type ON daily_lessons(type, active);
