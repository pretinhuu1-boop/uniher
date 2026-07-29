CREATE TABLE IF NOT EXISTS employee_identity_profiles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  mother_name TEXT,
  cpf_hash TEXT NOT NULL,
  cpf_last4 TEXT,
  rg_hash TEXT,
  rg_last4 TEXT,
  rg_issuer TEXT,
  birth_date TEXT,
  sex TEXT,
  marital_status TEXT,
  health_plan TEXT,
  cep TEXT,
  street_type TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  uf TEXT,
  email TEXT,
  ddd TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'spreadsheet',
  imported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT DEFAULT NULL,
  UNIQUE(company_id, cpf_hash)
);

CREATE INDEX IF NOT EXISTS idx_employee_identity_profiles_company
ON employee_identity_profiles(company_id, full_name);

CREATE INDEX IF NOT EXISTS idx_employee_identity_profiles_user
ON employee_identity_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_employee_identity_profiles_email
ON employee_identity_profiles(company_id, email);

CREATE TABLE IF NOT EXISTS employee_import_batches (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  filename TEXT,
  file_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'previewed' CHECK(status IN ('previewed', 'committed', 'failed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  error_rows INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  committed_at TEXT,
  deleted_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_import_batches_company_created
ON employee_import_batches(company_id, created_at DESC);
