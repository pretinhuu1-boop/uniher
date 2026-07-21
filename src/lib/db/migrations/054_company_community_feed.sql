CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_text TEXT NOT NULL,
  topic TEXT NOT NULL,
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
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
  ON community_posts(company_id, status, published_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_company_topic
  ON community_posts(company_id, topic, status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_supports_post
  ON community_post_supports(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_saves_user
  ON community_post_saves(user_id, created_at DESC);

INSERT INTO company_settings (id, company_id, setting_key, setting_value)
SELECT 'community-feed-company-enabled-' || companies.id,
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
