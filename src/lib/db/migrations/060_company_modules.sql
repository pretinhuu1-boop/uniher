CREATE TABLE IF NOT EXISTS company_modules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL CHECK(module_slug IN (
    'primary_health',
    'concierge',
    'education',
    'achievements',
    'nr1',
    'sipat',
    'human_development',
    'denunciation'
  )),
  module_state TEXT NOT NULL CHECK(module_state IN (
    'enabled',
    'locked',
    'coming_soon',
    'partner_managed',
    'requires_contract'
  )),
  visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0, 1)),
  notes TEXT CHECK(notes IS NULL OR length(trim(notes)) <= 500),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(company_id, module_slug)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_company
  ON company_modules(company_id, visible, module_state, module_slug);
