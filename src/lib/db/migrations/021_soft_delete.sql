ALTER TABLE companies ADD COLUMN deleted_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN deleted_at TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_deleted ON companies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
