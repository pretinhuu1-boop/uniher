CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_import_batches_company_file_sha
ON employee_import_batches(company_id, file_sha256)
WHERE deleted_at IS NULL;
