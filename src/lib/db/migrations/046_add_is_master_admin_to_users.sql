ALTER TABLE users ADD COLUMN is_master_admin INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET is_master_admin = 1
WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_users_is_master_admin ON users(is_master_admin);
