CREATE INDEX IF NOT EXISTS idx_users_active ON users(company_id, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invites_pending ON invites(company_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = 0;
CREATE INDEX IF NOT EXISTS idx_health_events_user ON health_events(user_id, date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
