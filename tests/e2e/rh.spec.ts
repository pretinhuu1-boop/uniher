/**
 * rh.spec.ts — Testes do painel RH / Admin da Empresa
 * Cobre: criação de RH via admin, login RH, dashboard, convites, aprovações, objetivos, permissões
 */
import { test, expect } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

test.describe('RH — Painel da Empresa', () => {
  test.describe.configure({ mode: 'serial' });

  const ts = Date.now().toString().slice(-8);
  const companyName = `Empresa RH ${ts}`;
  const companyCnpj = `22.333.444/0001-${ts.slice(0, 2)}`;
  const rhEmail = `rh-test-${ts}@empresa.com`;
  const rhPassword = 'RhTeste@2026';
  const rhName = `Gestora RH ${ts}`;

  let adminToken: string;
  let companyId: string;
  let rhToken: string;
  let inviteToken: string;
  let invitedUserId: string;

  // ─── Setup: Admin cria empresa e RH ──────────────────────────────────────────

  test('Setup: admin faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    adminToken = extractAccessTokenFromSetCookie(res);
    expect(adminToken).toBeTruthy();
  });

  test('Setup: admin cria empresa', async ({ request }) => {
    const res = await request.post('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: companyName,
        cnpj: companyCnpj,
        sector: 'Educação',
        plan: 'pro',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    companyId = body.company.id;
  });

  test('Setup: admin cria usuário RH vinculado à empresa', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: rhName,
        email: rhEmail,
        password: rhPassword,
        role: 'rh',
        company_id: companyId,
        mustChangePassword: false,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ─── Login RH ────────────────────────────────────────────────────────────────

  test('POST /api/auth/login — RH faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: rhEmail, password: rhPassword },
    });

    expect(res.status()).toBe(200);
    rhToken = extractAccessTokenFromSetCookie(res);
    expect(rhToken).toBeTruthy();
    const body = await res.json();
    expect(body.user.role).toBe('rh');
    expect(body.user.email).toBe(rhEmail);
  });

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  test('GET /api/dashboard — RH acessa dashboard da empresa', async ({ request }) => {
    const res = await request.get('/api/dashboard', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('kpis');
    expect(body).toHaveProperty('departments');
    expect(body).toHaveProperty('engagement');
    expect(body).toHaveProperty('invites');
  });

  // ─── Convites ────────────────────────────────────────────────────────────────

  test('POST /api/invites — RH cria convite para colaboradora', async ({ request }) => {
    const invitedEmail = `colab-rh-${ts}@email.com`;

    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        email: invitedEmail,
        role: 'colaboradora',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty('token');
    expect(body).toHaveProperty('inviteUrl');
    expect(body.email).toBe(invitedEmail);
    inviteToken = body.token;
  });

  test('POST /api/invites — RH NÃO pode convidar outro RH (403)', async ({ request }) => {
    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        email: `outro-rh-${ts}@empresa.com`,
        role: 'rh',
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('POST /api/invites — rejeita convite duplicado (mesmo email pendente)', async ({ request }) => {
    const duplicateEmail = `colab-dup-rh-${ts}@email.com`;

    // Primeiro convite
    await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { email: duplicateEmail, role: 'colaboradora' },
    });

    // Segundo convite mesmo email
    const res = await request.post('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: { email: duplicateEmail, role: 'colaboradora' },
    });

    expect(res.status()).toBe(409);
  });

  test('GET /api/invites — RH lista convites da empresa', async ({ request }) => {
    const res = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('invites');
    expect(Array.isArray(body.invites)).toBeTruthy();
    expect(body.invites.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Registro via convite e aprovação ────────────────────────────────────────

  test('POST /api/auth/register — colaboradora se registra via convite', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: `Colaboradora RH ${ts}`,
        email: `colab-rh-${ts}@email.com`,
        password: 'Colab@2026',
        role: 'colaboradora',
        companyId,
        inviteToken,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body).not.toHaveProperty('accessToken');
    invitedUserId = body.user.id;
  });

  test('PATCH /api/invites/approve — RH aprova colaboradora', async ({ request }) => {
    // Pula se não temos o userId da colaboradora
    test.skip(!invitedUserId, 'userId não disponível (registro falhou)');

    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        userId: invitedUserId,
        action: 'approve',
      },
    });

    // Pode ser 200 (aprovada) ou 404 (já aprovada automaticamente)
    expect([200, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('PATCH /api/invites/approve — RH NÃO pode aprovar outro RH (403)', async ({ request }) => {
    // Cria um RH pendente via admin
    const rhPendingEmail = `rh-pending-${ts}@empresa.com`;
    const createRes = await request.post('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${adminToken}` },
      data: {
        name: 'RH Pendente',
        email: rhPendingEmail,
        password: 'Teste@2026',
        role: 'rh',
        company_id: companyId,
      },
    });

    if (createRes.status() !== 200) {
      test.skip(true, 'Não foi possível criar RH pendente');
      return;
    }

    const { id: pendingRhId } = await createRes.json();

    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        userId: pendingRhId,
        action: 'approve',
      },
    });

    // Pode ser 403 (RH tentando aprovar RH) ou 404 (auto-approved=1)
    expect([403, 404]).toContain(res.status());
  });

  test('PATCH /api/invites/approve — rejeita body inválido', async ({ request }) => {
    const res = await request.patch('/api/invites/approve', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {},
    });

    expect(res.status()).toBe(422);
  });

  // ─── Objetivos ───────────────────────────────────────────────────────────────

  test('GET /api/rh/objectives — RH lista objetivos da empresa', async ({ request }) => {
    const res = await request.get('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('objectives');
    expect(Array.isArray(body.objectives)).toBeTruthy();
  });

  test('POST /api/rh/objectives — RH cria objetivo', async ({ request }) => {
    const res = await request.post('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        title: `Objetivo Teste ${ts}`,
        description: 'Objetivo criado nos testes e2e',
        type: 'weekly',
        target_type: 'points',
        target_value: 100,
        reward_type: 'points',
        reward_points: 50,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('objective');
    expect(body.objective).toHaveProperty('id');
    expect(body.objective.title).toContain('Objetivo Teste');
  });

  test('POST /api/rh/objectives — rejeita objetivo inválido (sem título)', async ({ request }) => {
    const res = await request.post('/api/rh/objectives', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
      data: {
        type: 'weekly',
        target_type: 'points',
        target_value: 100,
        reward_type: 'points',
        reward_points: 50,
      },
    });

    expect(res.status()).toBe(422);
  });

  // ─── Permissões ──────────────────────────────────────────────────────────────

  test('RH NÃO pode acessar endpoints de admin master', async ({ request }) => {
    const resCompanies = await request.get('/api/admin/companies', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resCompanies.status());

    const resUsers = await request.get('/api/admin/users', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resUsers.status());

    const resSystem = await request.get('/api/admin/system', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });
    expect([401, 403]).toContain(resSystem.status());
  });

  test('GET /api/invites — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/invites');
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/invites — rejeita sem autenticação', async ({ request }) => {
    const res = await request.post('/api/invites', {
      data: { email: 'test@test.com', role: 'colaboradora' },
    });
    expect([401, 403]).toContain(res.status());
  });
});
