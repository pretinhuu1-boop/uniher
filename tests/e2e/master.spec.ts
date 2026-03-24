/**
 * master.spec.ts — Testes do painel Admin Master
 * Cobre: login, empresas, usuários admin, health, system, backup, integrity
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

test.describe('Admin Master — Autenticação e Gestão', () => {
  test.describe.configure({ mode: 'serial' });

  let accessToken: string;

  // ─── Auth ────────────────────────────────────────────────────────────────────

  test('POST /api/auth/login — login admin com credenciais válidas', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('accessToken');
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.role).toBe('admin');
    expect(typeof body.accessToken).toBe('string');

    accessToken = body.accessToken;
  });

  test('POST /api/auth/login — rejeita senha incorreta', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: 'SenhaErrada@1' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/login — rejeita email inexistente (mesma mensagem)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'inexistente@uniher.com.br', password: 'Qualquer@1' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/auth/login — rejeita body inválido', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'not-an-email', password: '' },
    });

    expect(res.status()).toBe(400);
  });

  // ─── Health (público) ────────────────────────────────────────────────────────

  test('GET /api/health — retorna status do sistema (público)', async ({ request }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(body.status);
    expect(body).toHaveProperty('db');
    expect(body.db).toHaveProperty('status');
    expect(body.db).toHaveProperty('users');
    expect(body.db).toHaveProperty('companies');
    expect(body).toHaveProperty('memory');
    expect(body.memory).toHaveProperty('heapUsedMB');
    expect(body.memory).toHaveProperty('rssMB');
    expect(body).toHaveProperty('uptime');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  // ─── Empresas ────────────────────────────────────────────────────────────────

  test('GET /api/admin/companies — lista empresas (autenticado)', async ({ request }) => {
    const res = await request.get('/api/admin/companies', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('companies');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.companies)).toBeTruthy();
    expect(typeof body.total).toBe('number');
  });

  test('GET /api/admin/companies — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/admin/companies');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/admin/companies — cria empresa com dados válidos', async ({ request }) => {
    const ts = Date.now().toString().slice(-6);
    const cnpj = `11.222.333/0001-${ts.slice(0, 2)}`;

    const res = await request.post('/api/admin/companies', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: `Empresa Teste Master ${ts}`,
        cnpj,
        sector: 'Tecnologia',
        plan: 'trial',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('company');
    expect(body.company).toHaveProperty('id');
    expect(body.company).toHaveProperty('name');
  });

  test('POST /api/admin/companies — rejeita CNPJ duplicado', async ({ request }) => {
    const cnpj = '99.888.777/0001-11';

    // Primeira criação
    await request.post('/api/admin/companies', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Duplicada A', cnpj, sector: 'Saúde', plan: 'trial' },
    });

    // Segunda com mesmo CNPJ
    const res = await request.post('/api/admin/companies', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Duplicada B', cnpj, sector: 'Saúde', plan: 'trial' },
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/admin/companies — rejeita dados inválidos (sem nome)', async ({ request }) => {
    const res = await request.post('/api/admin/companies', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { cnpj: '00.000.000/0000-00' },
    });

    expect(res.status()).toBe(422);
  });

  // ─── Paginação de empresas ───────────────────────────────────────────────────

  test('GET /api/admin/companies — suporta paginação (limit/offset)', async ({ request }) => {
    const res = await request.get('/api/admin/companies?limit=2&offset=0', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(2);
    expect(body.offset).toBe(0);
    expect(body.companies.length).toBeLessThanOrEqual(2);
  });

  // ─── Usuários Admin ──────────────────────────────────────────────────────────

  test('GET /api/admin/users — lista usuários admin', async ({ request }) => {
    const res = await request.get('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('users');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.users)).toBeTruthy();
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/admin/users — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/admin/users — cria admin master com confirmação de senha', async ({ request }) => {
    const ts = Date.now().toString().slice(-8);

    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: `Admin Teste ${ts}`,
        email: `admin-teste-${ts}@uniher.com.br`,
        password: 'Teste@2026',
        role: 'admin',
        confirmCurrentPassword: ADMIN_PASSWORD,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('id');
  });

  test('POST /api/admin/users — rejeita admin sem confirmação de senha', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: 'Admin Sem Confirmar',
        email: `admin-noconfirm-${Date.now()}@uniher.com.br`,
        password: 'Teste@2026',
        role: 'admin',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('POST /api/admin/users — rejeita admin com senha de confirmação errada', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: 'Admin Senha Errada',
        email: `admin-wrongpw-${Date.now()}@uniher.com.br`,
        password: 'Teste@2026',
        role: 'admin',
        confirmCurrentPassword: 'SenhaErrada@1',
      },
    });

    expect(res.status()).toBe(403);
  });

  test('POST /api/admin/users — rejeita email duplicado', async ({ request }) => {
    const email = `admin-dup-${Date.now()}@uniher.com.br`;

    await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: 'Admin Dup 1',
        email,
        password: 'Teste@2026',
        role: 'admin',
        confirmCurrentPassword: ADMIN_PASSWORD,
      },
    });

    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: 'Admin Dup 2',
        email,
        password: 'Teste@2026',
        role: 'admin',
        confirmCurrentPassword: ADMIN_PASSWORD,
      },
    });

    expect(res.status()).toBe(409);
  });

  test('POST /api/admin/users — rejeita senha fraca', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: 'Admin Fraca',
        email: `admin-weak-${Date.now()}@uniher.com.br`,
        password: '12345678',
        role: 'admin',
        confirmCurrentPassword: ADMIN_PASSWORD,
      },
    });

    expect(res.status()).toBe(422);
  });

  test('POST /api/admin/users — cria usuário RH via admin', async ({ request }) => {
    const ts = Date.now().toString().slice(-8);

    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: `RH Teste ${ts}`,
        email: `rh-admin-${ts}@empresa.com`,
        password: 'Teste@2026',
        role: 'rh',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ─── Paginação de usuários ───────────────────────────────────────────────────

  test('GET /api/admin/users — suporta paginação (limit/offset)', async ({ request }) => {
    const res = await request.get('/api/admin/users?limit=1&offset=0', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(0);
    expect(body.users.length).toBeLessThanOrEqual(1);
  });

  // ─── System Info ─────────────────────────────────────────────────────────────

  test('GET /api/admin/system — retorna info do sistema (admin only)', async ({ request }) => {
    const res = await request.get('/api/admin/system', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('companies');
    expect(body).toHaveProperty('users');
    expect(body).toHaveProperty('master');
    expect(body.master).toHaveProperty('memory');
    expect(body.master).toHaveProperty('db');
    expect(body.master).toHaveProperty('system');
    expect(body).toHaveProperty('applied_migrations');
    expect(Array.isArray(body.applied_migrations)).toBeTruthy();
  });

  test('GET /api/admin/system — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/admin/system');
    expect([401, 403]).toContain(res.status());
  });

  // ─── Backup ──────────────────────────────────────────────────────────────────

  test('POST /api/admin/system/backup — cria backup do banco', async ({ request }) => {
    const res = await request.post('/api/admin/system/backup', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Em dev retorna 200, em prod retorna 403
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('backup');
      expect(body).toHaveProperty('sizeKB');
      expect(typeof body.sizeKB).toBe('number');
    } else {
      expect(res.status()).toBe(403);
    }
  });

  test('POST /api/admin/system/backup — rejeita sem autenticação', async ({ request }) => {
    const res = await request.post('/api/admin/system/backup');
    expect([401, 403]).toContain(res.status());
  });

  // ─── Integrity ───────────────────────────────────────────────────────────────

  test('POST /api/admin/system/integrity — verifica integridade do banco', async ({ request }) => {
    const res = await request.post('/api/admin/system/integrity', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('integrity');
      expect(body.integrity).toHaveProperty('status');
      expect(body.integrity.status).toBe('ok');
      expect(body).toHaveProperty('foreignKeys');
      expect(body.foreignKeys).toHaveProperty('status');
      expect(body).toHaveProperty('tables');
      expect(typeof body.tables).toBe('number');
    } else {
      expect(res.status()).toBe(403);
    }
  });

  test('POST /api/admin/system/integrity — rejeita sem autenticação', async ({ request }) => {
    const res = await request.post('/api/admin/system/integrity');
    expect([401, 403]).toContain(res.status());
  });
});
