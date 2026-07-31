ALTER TABLE users
ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

DELETE FROM refresh_tokens
WHERE rowid NOT IN (
  SELECT MAX(rowid)
  FROM refresh_tokens
  GROUP BY token_hash
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash_unique
ON refresh_tokens(token_hash);
