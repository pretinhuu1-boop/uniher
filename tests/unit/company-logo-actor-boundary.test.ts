import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  auth: {
    userId: 'rh-1',
    companyId: 'company-a',
    role: 'rh',
  },
  db: null as Database.Database | null,
  saveUploadedFile: vi.fn(),
  removeUploadedFile: vi.fn(),
  checkUploadRateLimit: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (..._roles: string[]) => (handler: any) => (req: NextRequest) => handler(req, {
    params: Promise.resolve({}),
    auth: deps.auth,
  }),
}));

vi.mock('@/lib/upload', () => ({
  saveUploadedFile: deps.saveUploadedFile,
  removeUploadedFile: deps.removeUploadedFile,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkUploadRateLimit: deps.checkUploadRateLimit,
}));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => operation(deps.db!),
  }),
}));

import { POST } from '@/app/api/upload/logo/route';

function request() {
  const formData = new FormData();
  formData.set('file', new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    'logo.png',
    { type: 'image/png' },
  ));
  return new NextRequest('http://localhost/api/upload/logo', {
    method: 'POST',
    body: formData,
  });
}

function logoUrl(companyId: string): string | null {
  return (deps.db!.prepare('SELECT logo_url FROM companies WHERE id = ?').get(companyId) as {
    logo_url: string | null;
  }).logo_url;
}

describe('company logo actor boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.auth = {
      userId: 'rh-1',
      companyId: 'company-a',
      role: 'rh',
    };
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        logo_url TEXT,
        deleted_at TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        role TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 1,
        blocked INTEGER NOT NULL DEFAULT 0,
        is_master_admin INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
      );
      CREATE TABLE user_uploads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        category TEXT NOT NULL
      );
      INSERT INTO companies (id, name, logo_url) VALUES
        ('company-a', 'Company A', '/uploads/logos/old-a.png'),
        ('company-b', 'Company B', '/uploads/logos/old-b.png');
      INSERT INTO users (id, company_id, role) VALUES ('rh-1', 'company-a', 'rh');
    `);
    deps.saveUploadedFile.mockImplementation(async (_file, _category, userId) => {
      deps.db!.prepare(`
        INSERT INTO user_uploads (id, user_id, file_path, file_size, category)
        VALUES ('reservation-1', ?, '/uploads/logos/new-logo.png', 4, 'logos')
      `).run(userId);
      return { url: '/uploads/logos/new-logo.png', filename: 'new-logo.png' };
    });
    deps.removeUploadedFile.mockResolvedValue(true);
    deps.checkUploadRateLimit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    deps.db?.close();
    deps.db = null;
  });

  it('compensates the new file when the RH actor is revoked before pointer confirmation', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run('rh-1');

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(logoUrl('company-a')).toBe('/uploads/logos/old-a.png');
    expect(deps.removeUploadedFile).toHaveBeenCalledWith('/uploads/logos/new-logo.png');
    expect(deps.removeUploadedFile).not.toHaveBeenCalledWith('/uploads/logos/old-a.png');
  });

  it('does not follow a stale companyId after the RH actor changes company', async () => {
    deps.db!.prepare('UPDATE users SET company_id = ? WHERE id = ?').run('company-b', 'rh-1');

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(logoUrl('company-a')).toBe('/uploads/logos/old-a.png');
    expect(logoUrl('company-b')).toBe('/uploads/logos/old-b.png');
    expect(deps.removeUploadedFile).toHaveBeenCalledWith('/uploads/logos/new-logo.png');
  });

  it('requires the upload reservation before confirming the company pointer', async () => {
    deps.saveUploadedFile.mockResolvedValue({
      url: '/uploads/logos/new-logo.png',
      filename: 'new-logo.png',
    });

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    expect(logoUrl('company-a')).toBe('/uploads/logos/old-a.png');
    expect(deps.removeUploadedFile).toHaveBeenCalledWith('/uploads/logos/new-logo.png');
  });

  it('requires an admin actor to remain active before confirming the pointer', async () => {
    deps.auth = {
      userId: 'admin-1',
      companyId: 'company-a',
      role: 'admin',
    };
    deps.db!.prepare(`
      INSERT INTO users (id, company_id, role, is_master_admin)
      VALUES ('admin-1', 'company-a', 'admin', 0)
    `).run();
    deps.db!.prepare('UPDATE users SET blocked = 1 WHERE id = ?').run('admin-1');

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    expect(logoUrl('company-a')).toBe('/uploads/logos/old-a.png');
    expect(deps.removeUploadedFile).toHaveBeenCalledWith('/uploads/logos/new-logo.png');
  });

  it('confirms an active RH reservation before removing the old logo', async () => {
    deps.removeUploadedFile.mockImplementation(async (url: string) => {
      if (url === '/uploads/logos/old-a.png') {
        expect(logoUrl('company-a')).toBe('/uploads/logos/new-logo.png');
      }
      return true;
    });

    const response = await POST(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(logoUrl('company-a')).toBe('/uploads/logos/new-logo.png');
    expect(deps.removeUploadedFile).toHaveBeenCalledWith('/uploads/logos/old-a.png');
    expect(deps.removeUploadedFile).not.toHaveBeenCalledWith('/uploads/logos/new-logo.png');
  });
});
