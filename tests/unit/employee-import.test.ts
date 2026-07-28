import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import {
  EMPLOYEE_IMPORT_HEADERS,
  makeEmployeeImportTemplateCsv,
} from '@/lib/employee-import/contract';
import { parseEmployeeImportCsv } from '@/lib/employee-import/parser';

describe('employee spreadsheet import foundation', () => {
  it('generates the approved CSV header exactly once', () => {
    expect(makeEmployeeImportTemplateCsv().split(/\r?\n/)[0]).toBe(EMPLOYEE_IMPORT_HEADERS.join(','));
  });

  it('parses approved rows and normalizes sensitive identifiers for safe preview', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`
      + 'Eduarda Eyuri Marketing LTDA,Ana Silva,Maria Silva,123.456.789-09,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,sp,ana@example.com,11,99999-0000';

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
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`
      + 'Empresa Teste,,Mae,123.456.789-09,,,,,,,,,,,,,,,,,';

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows[0].errors).toContain('NOME COMPLETO e obrigatorio');
    expect(JSON.stringify(result.errorRows[0])).not.toContain('123.456.789-09');
  });

  it('rejects invalid CPF check digits', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`
      + 'Empresa Teste,Ana Silva,Mae,111.111.111-11,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,SP,ana@example.com,11,99999-0000';

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows[0].errors).toContain('CPF invalido');
    expect(JSON.stringify(result.errorRows[0])).not.toContain('111.111.111-11');
  });

  it('uses a server-side HMAC secret for CPF hashes', () => {
    const previous = process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET;
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`
      + 'Empresa Teste,Ana Silva,Mae,123.456.789-09,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,SP,ana@example.com,11,99999-0000';
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

    expect(applyMigration(db, '065_employee_identity_imports.sql', sql)).toBe('applied');
    expect(applyMigration(db, '065_employee_identity_imports.sql', sql)).toBe('skipped');
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
  });
});
