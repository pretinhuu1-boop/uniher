ALTER TABLE users
ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash_unique
ON refresh_tokens(token_hash);
