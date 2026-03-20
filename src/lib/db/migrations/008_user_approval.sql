-- 008: User approval flow for invite registrations
ALTER TABLE users ADD COLUMN approved INTEGER DEFAULT 1;
-- Invited users start as pending (0), regular users start as approved (1)
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(company_id, approved);
