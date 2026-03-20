-- ============================================
-- 005: User management fields
-- ============================================

ALTER TABLE users ADD COLUMN blocked INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT;
