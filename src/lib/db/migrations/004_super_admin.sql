-- Migration 002: Adicionar empresa UniHER Plataforma e suporte a super_admin
-- A migration 001 ja suporta: role IN ('admin', 'rh', 'lideranca', 'colaboradora')
-- e company_id nullable. Esta migration apenas garante a empresa da plataforma.

INSERT OR IGNORE INTO companies (id, name, trade_name, cnpj, sector, plan, contact_name, contact_email, contact_phone)
VALUES ('company_uniher', 'UniHER Plataforma', 'UniHER', '00.000.000/0001-00', 'Tecnologia', 'enterprise', 'UniHER Admin', 'admin@uniher.com.br', '');
