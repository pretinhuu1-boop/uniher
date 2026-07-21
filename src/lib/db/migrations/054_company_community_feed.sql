CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 120),
  summary TEXT NOT NULL CHECK(length(trim(summary)) BETWEEN 10 AND 240),
  body_text TEXT NOT NULL CHECK(length(body_text) BETWEEN 20 AND 8000),
  topic TEXT NOT NULL CHECK(topic IN ('pausas', 'sono', 'movimento', 'cuidado', 'geral')),
  read_time_minutes INTEGER NOT NULL DEFAULT 5 CHECK(read_time_minutes BETWEEN 1 AND 60),
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  CHECK(status <> 'published' OR published_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS community_post_supports (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_post_saves (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_company_status
  ON community_posts(company_id, status, published_at DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_company_topic
  ON community_posts(company_id, topic, status, published_at DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_supports_post
  ON community_post_supports(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_saves_user
  ON community_post_saves(user_id, created_at DESC);

INSERT INTO company_settings (id, company_id, setting_key, setting_value)
SELECT lower(hex(randomblob(16))),
       companies.id,
       'feed_company_enabled',
       '0'
FROM companies
WHERE NOT EXISTS (
  SELECT 1
  FROM company_settings
  WHERE company_settings.company_id = companies.id
    AND company_settings.setting_key = 'feed_company_enabled'
);
