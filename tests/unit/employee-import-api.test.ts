import Database from 'better-sqlite3';
import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPLOYEE_IMPORT_HEADERS } from '@/lib/employee-import/contract';

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
});
