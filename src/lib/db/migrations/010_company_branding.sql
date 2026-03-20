-- ============================================
-- 010: Company branding + block + plan update
-- ============================================

-- Allow master to block/unblock entire companies
ALTER TABLE companies ADD COLUMN is_active INTEGER DEFAULT 1;

-- Company visual identity (set by RH admin)
ALTER TABLE companies ADD COLUMN primary_color TEXT;
ALTER TABLE companies ADD COLUMN secondary_color TEXT;
