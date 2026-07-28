ALTER TABLE personal_semaforo_entries
ADD COLUMN dimension TEXT NOT NULL DEFAULT 'prevention';

CREATE INDEX IF NOT EXISTS idx_personal_semaforo_entries_user_dimension_created
ON personal_semaforo_entries(user_id, dimension, created_at DESC, id DESC)
WHERE deleted_at IS NULL;
