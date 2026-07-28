import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPLOYEE_IMPORT_HEADERS } from '@/lib/employee-import/contract';
import { applyMigration } from '@/lib/db/migrations/runner';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  auditEntries: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withAuth: expose, withRole: () => expose };
});

vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!boundary.db) throw new Error('database not configured');
    return boundary.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!boundary.db) throw new Error('database not configured');
      return operation(boundary.db);
    },
  }),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkAdminRateLimit: async () => undefined,
  checkReadRateLimit: async () => undefined,
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(async (entry: Record<string, unknown>) => {
    boundary.auditEntries.push(entry);
  }),
}));

import { GET as getImportTemplate } from '@/app/api/rh/employees/import-template/route';
import { POST as postImportCommit } from '@/app/api/rh/employees/import-commit/route';
import { POST as postImportPreview } from '@/app/api/rh/employees/import-preview/route';

function context(userId: string, role: string, companyId: string | null = 'company-a') {
  return {
    auth: { userId, role, companyId },
    params: Promise.resolve({}),
  };
}

function validCsv() {
  return `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`
    + 'Empresa A,Ana Silva,Maria Silva,123.456.789-09,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,SP,ana@example.com,11,99999-0000';
}

function apiRequest(input: string, init?: RequestInit): NextRequest {
  return new Request(input, init) as unknown as NextRequest;
}

function createDatabase() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE companies (
      id TEXT PRIMARY KEY,
      name TEXT,
      is_active INTEGER DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT
    );
    INSERT INTO companies (id, name, is_active, deleted_at) VALUES
      ('company-a', 'Empresa A', 1, NULL),
      ('company-b', 'Empresa B', 1, NULL),
      ('company-deleted', 'Empresa Deleted', 1, '2026-01-01'),
      ('company-inactive', 'Empresa Inactive', 0, NULL);
    INSERT INTO users (id, company_id, name, email, role, blocked, approved, deleted_at) VALUES
      ('rh-a', 'company-a', 'Rita RH', 'rh-a@example.test', 'rh', 0, 1, NULL),
      ('admin-a', 'company-a', 'Alice Admin Empresa', 'admin-a@example.test', 'admin', 0, 1, NULL),
      ('leader-a', 'company-a', 'Lia Lider', 'leader-a@example.test', 'lideranca', 0, 1, NULL),
      ('collab-a', 'company-a', 'Ana Colab', 'ana@example.test', 'colaboradora', 0, 1, NULL),
      ('rh-blocked', 'company-a', 'Bloqueada RH', 'blocked@example.test', 'rh', 1, 1, NULL),
      ('rh-b', 'company-b', 'Rita RH B', 'rh-b@example.test', 'rh', 0, 1, NULL);
  `);
  const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '065_employee_identity_imports.sql');
  applyMigration(db, '065_employee_identity_imports.sql', fs.readFileSync(migrationPath, 'utf8'));
  return db;
}

beforeEach(() => {
  boundary.db = createDatabase();
  boundary.auditEntries = [];
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('employee import RH APIs', () => {
  it('returns the approved template only for an active persisted RH actor', async () => {
    const response = await getImportTemplate(apiRequest('http://localhost/api/rh/employees/import-template'), context('rh-a', 'rh'));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('uniher-colaboradoras-template.csv');
    await expect(response.text()).resolves.toBe(`${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`);
  });

  it('denies collaborators and leadership even when middleware is bypassed in tests', async () => {
    const collaborator = await getImportTemplate(apiRequest('http://localhost/api/rh/employees/import-template'), context('collab-a', 'colaboradora'));
    const leader = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: validCsv(),
      }),
      context('leader-a', 'lideranca'),
    );

    expect(collaborator.status).toBe(403);
    expect(leader.status).toBe(403);
  });

  it('rejects token role or tenant drift against persisted actor state', async () => {
    const wrongRole = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: validCsv(),
      }),
      context('rh-a', 'admin'),
    );
    const wrongCompany = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: validCsv(),
      }),
      context('rh-a', 'rh', 'company-b'),
    );

    expect(wrongRole.status).toBe(403);
    expect(wrongCompany.status).toBe(403);
  });

  it('previews CSV rows without echoing personal data', async () => {
    const response = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv', 'x-forwarded-for': '203.0.113.10, 10.0.0.1' },
        body: validCsv(),
      }),
      context('rh-a', 'rh'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({ totalRows: 1, validRows: 1, errorRows: 0 });
    expect(body.validRows[0]).toMatchObject({
      rowNumber: 2,
      fullNamePreview: 'A*** S***',
      emailPreview: 'a***@***',
      cpfLast4: '8909',
      rgLast4: '6789',
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('Ana Silva');
    expect(serialized).not.toContain('Maria Silva');
    expect(serialized).not.toContain('123.456.789-09');
    expect(serialized).not.toContain('12.345.678-9');
    expect(serialized).not.toContain('ana@example.com');
    expect(serialized).not.toContain('1990-03-15');
    expect(serialized).not.toContain('Boa Vista');
    expect(serialized).not.toContain('999990000');
    expect(boundary.auditEntries).toHaveLength(1);
    expect(boundary.auditEntries[0]).toMatchObject({
      actorId: 'rh-a',
      actorEmail: 'rh-a@example.test',
      actorRole: 'rh',
      action: 'employee_import_preview',
      entityType: 'company',
      entityId: 'company-a',
      entityLabel: 'Empresa A',
      details: { totalRows: 1, validRows: 1, errorRows: 0 },
      ip: '203.0.113.10',
    });
    expect(JSON.stringify(boundary.auditEntries[0])).not.toContain('Ana Silva');
    expect(JSON.stringify(boundary.auditEntries[0])).not.toContain('ana@example.com');
  });

  it('rejects rows whose EMPRESA column does not match the actor company', async () => {
    const response = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: validCsv().replace('Empresa A', 'Empresa B'),
      }),
      context('rh-a', 'rh'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({ totalRows: 1, validRows: 0, errorRows: 1 });
    expect(body.errorRows[0]).toMatchObject({
      rowNumber: 2,
      emailPreview: 'a***@***',
      errors: ['EMPRESA nao corresponde a empresa autenticada'],
    });
    expect(JSON.stringify(body)).not.toContain('ana@example.com');
  });

  it('rejects inactive persisted actors and oversized CSV bodies', async () => {
    const blocked = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: validCsv(),
      }),
      context('rh-blocked', 'rh'),
    );
    const oversized = await postImportPreview(
      apiRequest('http://localhost/api/rh/employees/import-preview', {
        method: 'POST',
        headers: { 'content-type': 'text/csv' },
        body: 'a'.repeat(2_000_001),
      }),
      context('rh-a', 'rh'),
    );

    expect(blocked.status).toBe(403);
    expect(oversized.status).toBe(413);
  });

  it('commits valid rows into tenant-scoped identity profiles without returning PII', async () => {
    const response = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-real-ip': '198.51.100.5' },
        body: JSON.stringify({ csv: validCsv(), filename: 'colaboradoras.csv' }),
      }),
      context('rh-a', 'rh'),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
      insertedRows: 1,
      updatedRows: 0,
    });
    expect(body.batchId).toEqual(expect.any(String));
    expect(body.fileSha256).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));

    const profile = boundary.db!.prepare(`
      SELECT company_id, full_name, mother_name, cpf_hash, cpf_last4, rg_hash, rg_last4, email, phone, imported_by
      FROM employee_identity_profiles
      WHERE company_id = 'company-a'
    `).get() as Record<string, unknown>;
    expect(profile).toMatchObject({
      company_id: 'company-a',
      full_name: 'Ana Silva',
      mother_name: 'Maria Silva',
      cpf_last4: '8909',
      rg_last4: '6789',
      email: 'ana@example.com',
      phone: '999990000',
      imported_by: 'rh-a',
    });
    expect(profile.cpf_hash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(profile.rg_hash).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/));

    const batch = boundary.db!.prepare('SELECT company_id, filename, status, total_rows, valid_rows, error_rows, created_by FROM employee_import_batches').get();
    expect(batch).toMatchObject({
      company_id: 'company-a',
      filename: 'colaboradoras.csv',
      status: 'committed',
      total_rows: 1,
      valid_rows: 1,
      error_rows: 0,
      created_by: 'rh-a',
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('Ana Silva');
    expect(serialized).not.toContain('Maria Silva');
    expect(serialized).not.toContain('123.456.789-09');
    expect(serialized).not.toContain('12.345.678-9');
    expect(serialized).not.toContain('ana@example.com');
    expect(serialized).not.toContain('999990000');
    expect(boundary.auditEntries.at(-1)).toMatchObject({
      actorId: 'rh-a',
      action: 'employee_import_commit',
      entityType: 'employee_import_batch',
      entityId: body.batchId,
      details: {
        status: 'committed',
        totalRows: 1,
        validRows: 1,
        errorRows: 0,
        insertedRows: 1,
        updatedRows: 0,
      },
      ip: '198.51.100.5',
    });
    expect(JSON.stringify(boundary.auditEntries.at(-1))).not.toContain('Ana Silva');
    expect(JSON.stringify(boundary.auditEntries.at(-1))).not.toContain('ana@example.com');
  });

  it('sanitizes stored filenames and rejects non-CSV multipart uploads', async () => {
    const unsafeName = '../<script>alert(1)</script>-' + 'a'.repeat(300) + '.csv';
    const response = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: validCsv(), filename: unsafeName }),
      }),
      context('rh-a', 'rh'),
    );

    expect(response.status).toBe(200);
    const batch = boundary.db!.prepare('SELECT filename FROM employee_import_batches').get() as { filename: string };
    expect(batch.filename).toContain('scriptalert1script-');
    expect(batch.filename).toMatch(/\.csv$/);
    expect(batch.filename.length).toBeLessThanOrEqual(255);
    expect(batch.filename).not.toContain('..');
    expect(batch.filename).not.toContain('/');
    expect(batch.filename).not.toContain('<');

    const form = new FormData();
    form.set('file', new File([validCsv()], 'colaboradoras.exe', { type: 'text/csv' }));
    const rejected = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        body: form,
      }),
      context('rh-a', 'rh'),
    );

    expect(rejected.status).toBe(422);
    await expect(rejected.json()).resolves.toMatchObject({ error: 'Arquivo deve ter extensao .csv.' });
  });

  it('upserts duplicate CPF within a company and allows the same CPF in another company', async () => {
    const first = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: validCsv(), filename: 'first.csv' }),
      }),
      context('rh-a', 'rh'),
    );
    const second = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: validCsv().replace('Ana Silva', 'Ana Atualizada'), filename: 'second.csv' }),
      }),
      context('rh-a', 'rh'),
    );
    const otherCompany = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: validCsv().replace('Empresa A', 'Empresa B'), filename: 'company-b.csv' }),
      }),
      context('rh-b', 'rh', 'company-b'),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).summary).toMatchObject({ insertedRows: 0, updatedRows: 1 });
    expect(otherCompany.status).toBe(200);
    expect(boundary.db!.prepare('SELECT COUNT(*) AS count FROM employee_identity_profiles').get()).toEqual({ count: 2 });
    expect(boundary.db!.prepare("SELECT full_name FROM employee_identity_profiles WHERE company_id = 'company-a'").get())
      .toEqual({ full_name: 'Ana Atualizada' });
  });

  it('refuses commit when the CSV has validation errors or a mismatched company', async () => {
    const response = await postImportCommit(
      apiRequest('http://localhost/api/rh/employees/import-commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: validCsv().replace('Empresa A', 'Empresa B'), filename: 'wrong-company.csv' }),
      }),
      context('rh-a', 'rh'),
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.summary).toEqual({ totalRows: 1, validRows: 0, errorRows: 1 });
    expect(body.errorRows[0].errors).toEqual(['EMPRESA nao corresponde a empresa autenticada']);
    expect(boundary.db!.prepare('SELECT COUNT(*) AS count FROM employee_identity_profiles').get()).toEqual({ count: 0 });
    expect(JSON.stringify(body)).not.toContain('ana@example.com');
    expect(JSON.stringify(boundary.auditEntries.at(-1))).not.toContain('ana@example.com');
  });
});
