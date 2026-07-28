import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import {
  EMPLOYEE_IMPORT_HEADERS,
  makeEmployeeImportTemplateCsv,
} from '@/lib/employee-import/contract';
import { parseEmployeeImportCsv } from '@/lib/employee-import/parser';

function csvWithDataRow(dataRow: string): string {
  return `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n${dataRow}`;
}

const validDataRow = 'Eduarda Eyuri Marketing LTDA,Ana Silva,Maria Silva,123.456.789-09,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,sp,ana@example.com,11,99999-0000';

describe('employee spreadsheet import foundation', () => {
  it('generates the approved CSV header exactly once', () => {
    expect(makeEmployeeImportTemplateCsv().split(/\r?\n/)[0]).toBe(EMPLOYEE_IMPORT_HEADERS.join(','));
  });

  it('parses approved rows and normalizes sensitive identifiers for safe preview', () => {
    const csv = csvWithDataRow(validDataRow);

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(1);
    expect(result.errorRows).toHaveLength(0);
    expect(result.validRows[0]).toMatchObject({
      rowNumber: 2,
      fullName: 'Ana Silva',
      cpfLast4: '8909',
      cpfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      rgLast4: '6789',
      rgHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      birthDate: '1990-03-15',
      uf: 'SP',
      email: 'ana@example.com',
      ddd: '11',
      phone: '999990000',
    });
    expect(JSON.stringify(result.validRows[0])).not.toContain('123.456.789-09');
    expect(JSON.stringify(result.validRows[0])).not.toContain('12.345.678-9');
  });

  it('rejects missing required fields without echoing raw CPF', () => {
    const csv = csvWithDataRow('Empresa Teste,,Mae,123.456.789-09,,,,,,,,,,,,,,,,,');

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows[0].errors).toContain('NOME COMPLETO e obrigatorio');
    expect(JSON.stringify(result.errorRows[0])).not.toContain('123.456.789-09');
    expect(result.errorRows[0]).toHaveProperty('emailPreview');
    expect(result.errorRows[0]).not.toHaveProperty('email');
  });

  it('rejects invalid CPF check digits', () => {
    const csv = csvWithDataRow('Empresa Teste,Ana Silva,Mae,111.111.111-11,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,SP,ana@example.com,11,99999-0000');

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows[0].errors).toContain('CPF invalido');
    expect(JSON.stringify(result.errorRows[0])).not.toContain('111.111.111-11');
  });

  it('uses a server-side HMAC secret for CPF hashes', () => {
    const previous = process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
    const csv = csvWithDataRow(validDataRow);
    try {
      process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET = 'a'.repeat(32);
      const first = parseEmployeeImportCsv(csv, { companyId: 'company-a' }).validRows[0].cpfHash;
      process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET = 'b'.repeat(32);
      const second = parseEmployeeImportCsv(csv, { companyId: 'company-a' }).validRows[0].cpfHash;
      const unsalted = createHash('sha256').update('company-a:12345678909').digest('hex');

      expect(first).not.toBe(second);
      expect(first).not.toBe(unsalted);
    } finally {
      if (previous === undefined) delete process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
      else process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET = previous;
    }
  });

  it('requires an explicit HMAC secret outside test and development', () => {
    const previousSecret = process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
    const previousFallbackSecret = process.env.EMPLOYEE_IMPORT_PII_HMAC_SECRET;
    const csv = csvWithDataRow(validDataRow);

    try {
      delete process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
      delete process.env.EMPLOYEE_IMPORT_PII_HMAC_SECRET;
      vi.stubEnv('NODE_ENV', 'staging');

      expect(() => parseEmployeeImportCsv(csv, { companyId: 'company-a' })).toThrow(
        'UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET must be set with at least 32 characters',
      );
    } finally {
      if (previousSecret === undefined) delete process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
      else process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET = previousSecret;
      if (previousFallbackSecret === undefined) delete process.env.EMPLOYEE_IMPORT_PII_HMAC_SECRET;
      else process.env.EMPLOYEE_IMPORT_PII_HMAC_SECRET = previousFallbackSecret;
      vi.unstubAllEnvs();
    }
  });

  it('rejects files above the configured row cap before mapping personal data', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n${Array.from({ length: 3 }, () => validDataRow).join('\n')}`;

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a', maxRows: 2 });

    expect(result.totalRows).toBe(3);
    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows).toEqual([
      {
        rowNumber: 1,
        cpfLast4: null,
        emailPreview: null,
        errors: ['Limite de 2 linhas excedido'],
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('Ana Silva');
    expect(JSON.stringify(result)).not.toContain('ana@example.com');
  });

  it('creates isolated profile and batch tables with company scoped CPF hash uniqueness', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE companies (id TEXT PRIMARY KEY);
      CREATE TABLE users (id TEXT PRIMARY KEY);
      INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    `);
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '065_employee_identity_imports.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const idempotencyMigrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '066_employee_import_batch_idempotency.sql');
    const idempotencySql = fs.readFileSync(idempotencyMigrationPath, 'utf8');

    expect(applyMigration(db, '065_employee_identity_imports.sql', sql)).toBe('applied');
    expect(applyMigration(db, '065_employee_identity_imports.sql', sql)).toBe('skipped');
    expect(applyMigration(db, '066_employee_import_batch_idempotency.sql', idempotencySql)).toBe('applied');
    expect(db.prepare("SELECT name FROM pragma_table_info('employee_identity_profiles') WHERE name = 'deleted_at'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM pragma_table_info('employee_import_batches') WHERE name = 'deleted_at'").get()).toBeTruthy();
    expect(db.prepare("SELECT on_delete FROM pragma_foreign_key_list('employee_identity_profiles') WHERE \"table\" = 'companies'").get()).toEqual({ on_delete: 'RESTRICT' });

    db.prepare(`
      INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email)
      VALUES ('a1', 'company-a', 'Ana', 'hash-a', '8909', 'ana@example.com')
    `).run();
    db.prepare(`
      INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email)
      VALUES ('b1', 'company-b', 'Ana', 'hash-a', '8909', 'ana@example.com')
    `).run();
    expect(() => db.prepare("DELETE FROM companies WHERE id = 'company-a'").run()).toThrow();
    expect(() => db.prepare(`
      INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email)
      VALUES ('a2', 'company-a', 'Ana 2', 'hash-a', '8909', 'ana2@example.com')
    `).run()).toThrow();
    db.prepare(`
      INSERT INTO employee_import_batches (id, company_id, filename, file_sha256, status, total_rows, valid_rows, error_rows)
      VALUES ('batch-a', 'company-a', 'a.csv', 'sha-a', 'committed', 1, 1, 0)
    `).run();
    expect(() => db.prepare(`
      INSERT INTO employee_import_batches (id, company_id, filename, file_sha256, status, total_rows, valid_rows, error_rows)
      VALUES ('batch-a2', 'company-a', 'a-again.csv', 'sha-a', 'committed', 1, 1, 0)
    `).run()).toThrow();
    db.prepare(`
      INSERT INTO employee_import_batches (id, company_id, filename, file_sha256, status, total_rows, valid_rows, error_rows)
      VALUES ('batch-b', 'company-b', 'b.csv', 'sha-a', 'committed', 1, 1, 0)
    `).run();
  });
});
