/**
 * colaboradora.spec.ts — Testes do painel da Colaboradora
 * Cobre: registro via convite, login, dashboard, gamificação, missões, leaderboard, preferências
 */
import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

test.describe('Colaboradora — Gamificação e Jornada', () => {
  test.describe.configure({ mode: 'serial' });

  const ts = Date.now().toString().slice(-8);
  const companyName = `Empresa Colab ${ts}`;
  const companyCnpj = `33.444.555/0001-${ts.slice(0, 2)}`;
  const rhEmail = `rh-colab-${ts}@empresa.com`;
  const rhPassword = 'RhColab@2026';
  const colabEmail = `colab-${ts}@email.com`;
  const colabPassword = 'Colab@2026';
  const colabName = `Maria Colab ${ts}`;

  let adminToken: string;
  let companyId: string;
  let rhToken: string;
  let colabToken: string;
  let colabUserId: string;
  let inviteToken: string;

  // ─── Setup: Admin → Empresa → RH → Convite → Registro ───────────────────────

  test('Setup: admin faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status()).toBe(200);
    adminToken = (await res.json()).accessToken;
  });

  test('Setup: admin cria empresa', async ({ request }) => {
    const res = await request.post('/api/admin/companies', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { name: companyName, cnpj: companyCnpj, sector: 'Saúde', plan: 'pro' },
    });
    expect(res.status()).toBe(200);
    companyId = (await res.json()).company.id;
  });

  test('Setup: admin cria RH vinculado à empresa', async ({ request }) => {
    const res = await request.post('/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: `RH Colab ${ts}`,
        email: rhEmail,
        password: rhPassword,
        role: 'rh',
        company_id: companyId,
      },
    });
    expect(res.status()).toBe(200);
  });

  test('Setup: RH faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: rhEmail, password: rhPassword },
    });
    expect(res.status()).toBe(200);
    rhToken = (await res.json()).accessToken;
  });

  test('Setup: RH cria convite para colaboradora', async ({ request }) => {
    const res = await request.post('/api/invites', {
      headers: { Authorization: `Bearer ${rhToken}` },
      data: { email: colabEmail, role: 'colaboradora' },
    });
    expect(res.status()).toBe(200);
    inviteToken = (await res.json()).token;
  });

  test('POST /api/auth/register — colaboradora se registra via convite', async ({ request }) => {
    const res = await request.post('/api/auth/register', {
      data: {
        name: colabName,
        email: colabEmail,
        password: colabPassword,
        role: 'colaboradora',
        companyId,
        inviteToken,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('accessToken');
    expect(body.user.role).toBe('colaboradora');
    colabUserId = body.user.id;
    colabToken = body.accessToken;
  });

  test('Setup: RH aprova colaboradora', async ({ request }) => {
    test.skip(!colabUserId, 'Registro da colaboradora falhou');

    const res = await request.patch('/api/invites/approve', {
      headers: { Authorization: `Bearer ${rhToken}` },
      data: { userId: colabUserId, action: 'approve' },
    });
    // 200 = aprovada, 404 = já aprovada auto
    expect([200, 404]).toContain(res.status());
  });

  test('POST /api/auth/login — colaboradora faz login', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: colabEmail, password: colabPassword },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('colaboradora');
    expect(body.user.email).toBe(colabEmail);
    colabToken = body.accessToken;
  });

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  test('GET /api/dashboard — colaboradora acessa dashboard', async ({ request }) => {
    const res = await request.get('/api/dashboard', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('kpis');
  });

  // ─── Gamificação — Check-in ──────────────────────────────────────────────────

  test('POST /api/gamification/check-in — realiza check-in diário', async ({ request }) => {
    const res = await request.post('/api/gamification/check-in', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // O check-in retorna dados de pontos/streak
    expect(body).toBeTruthy();
  });

  test('POST /api/gamification/check-in — segundo check-in no mesmo dia', async ({ request }) => {
    const res = await request.post('/api/gamification/check-in', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    // Pode retornar 200 (com mensagem já fez check-in) ou 409
    expect([200, 409]).toContain(res.status());
  });

  test('POST /api/gamification/check-in — rejeita sem autenticação', async ({ request }) => {
    const res = await request.post('/api/gamification/check-in');
    expect([401, 403]).toContain(res.status());
  });

  // ─── Gamificação — Streak ────────────────────────────────────────────────────

  test('GET /api/gamification/streak-status — retorna status do streak', async ({ request }) => {
    const res = await request.get('/api/gamification/streak-status', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('streak');
    expect(body).toHaveProperty('checkedInToday');
    expect(body).toHaveProperty('levelInfo');
    expect(body.levelInfo).toHaveProperty('level');
    expect(body.levelInfo).toHaveProperty('currentXP');
    expect(body.levelInfo).toHaveProperty('nextLevelXP');
    expect(typeof body.streak).toBe('number');
  });

  // ─── Gamificação — Missões Diárias ───────────────────────────────────────────

  test('GET /api/gamification/daily-missions — lista missões do dia', async ({ request }) => {
    const res = await request.get('/api/gamification/daily-missions', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('missions');
    expect(Array.isArray(body.missions)).toBeTruthy();
  });

  test('POST /api/gamification/daily-missions/:id/complete — completa missão', async ({ request }) => {
    // Primeiro busca missões disponíveis
    const missionsRes = await request.get('/api/gamification/daily-missions', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    const { missions } = await missionsRes.json();
    if (!missions || missions.length === 0) {
      test.skip(true, 'Nenhuma missão disponível para completar');
      return;
    }

    const missionId = missions[0].id;

    const res = await request.post(`/api/gamification/daily-missions/${missionId}/complete`, {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    // 200 = completou, 400/409 = já completou
    expect([200, 400, 409]).toContain(res.status());
  });

  // ─── Gamificação — Leaderboard ───────────────────────────────────────────────

  test('GET /api/gamification/leaderboard — ranking por departamento', async ({ request }) => {
    const res = await request.get('/api/gamification/leaderboard', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('type');
    // Pode ter rankings ou ranking
    expect(body.rankings || body.ranking).toBeTruthy();
  });

  test('GET /api/gamification/leaderboard?type=league — ranking por liga', async ({ request }) => {
    const res = await request.get('/api/gamification/leaderboard?type=league', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe('league');
    expect(body).toHaveProperty('ranking');
  });

  // ─── Desafios ────────────────────────────────────────────────────────────────

  test('GET /api/collaborator/challenges — lista desafios', async ({ request }) => {
    const res = await request.get('/api/collaborator/challenges', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    // Retorna array ou objeto com challenges
    expect(body).toBeTruthy();
  });

  test('GET /api/collaborator/challenges — rejeita sem autenticação', async ({ request }) => {
    const res = await request.get('/api/collaborator/challenges');
    expect([401, 403]).toContain(res.status());
  });

  // ─── Preferências de Notificação ─────────────────────────────────────────────

  test('GET /api/users/me/notification-preferences — retorna preferências', async ({ request }) => {
    const res = await request.get('/api/users/me/notification-preferences', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('prefs');
    expect(body.prefs).toHaveProperty('reminder_times');
    expect(body.prefs).toHaveProperty('mission_reminders');
    expect(body.prefs).toHaveProperty('browser_enabled');
    expect(Array.isArray(body.prefs.reminder_times)).toBeTruthy();
  });

  test('PATCH /api/users/me/notification-preferences — atualiza preferências', async ({ request }) => {
    const res = await request.patch('/api/users/me/notification-preferences', {
      headers: { Authorization: `Bearer ${colabToken}` },
      data: {
        reminder_times: ['09:00', '17:00'],
        browser_enabled: true,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verifica se persistiu
    const verifyRes = await request.get('/api/users/me/notification-preferences', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });
    const verifyBody = await verifyRes.json();
    expect(verifyBody.prefs.reminder_times).toEqual(['09:00', '17:00']);
    expect(verifyBody.prefs.browser_enabled).toBe(true);
  });

  test('PATCH /api/users/me/notification-preferences — rejeita dados inválidos', async ({ request }) => {
    const res = await request.patch('/api/users/me/notification-preferences', {
      headers: { Authorization: `Bearer ${colabToken}` },
      data: {
        reminder_times: ['invalid-time'],
      },
    });

    expect(res.status()).toBe(400);
  });

  // ─── Permissões da Colaboradora ──────────────────────────────────────────────

  test('Colaboradora NÃO pode acessar endpoints de admin', async ({ request }) => {
    const res = await request.get('/api/admin/companies', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Colaboradora NÃO pode acessar endpoints de RH', async ({ request }) => {
    const resInvites = await request.get('/api/invites', {
      headers: { Authorization: `Bearer ${colabToken}` },
    });
    expect([401, 403]).toContain(resInvites.status());

    const resObjectives = await request.post('/api/rh/objectives', {
      headers: { Authorization: `Bearer ${colabToken}` },
      data: {
        title: 'Objetivo Hacker',
        type: 'weekly',
        target_type: 'points',
        target_value: 100,
        reward_type: 'points',
        reward_points: 50,
      },
    });
    expect([401, 403]).toContain(resObjectives.status());
  });
});
