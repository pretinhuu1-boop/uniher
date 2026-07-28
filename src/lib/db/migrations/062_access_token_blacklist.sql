CREATE TABLE IF NOT EXISTS access_token_blacklist (
  token_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_access_token_blacklist_expires_at
  ON access_token_blacklist(expires_at);
