import { expect, test, type APIRequestContext } from '@playwright/test';
import path from 'node:path';
import {
  expectNoRecursiveKeys,
  expectPrivacyReviewResponse,
  expectPrivateResponse,
  extractAccessTokenFromSetCookie,
} from './helpers/auth';
import playwrightDbSafety from '../playwright-db-safety.cjs';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

function isLoopbackHostname(hostname: string) {
  const ipv4Octet = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
  const ipv4Loopback = new RegExp(`^127(?:\\.${ipv4Octet}){3}$`);
  return hostname === 'localhost' || hostname === '[::1]' || ipv4Loopback.test(hostname);
}

function assertJourneyMutationEnvironment(baseURL?: string) {
  expect(baseURL, 'collaborator-journey requires Playwright baseURL').toBeTruthy();
  const hostname = new URL(baseURL!).hostname;
  expect(
    isLoopbackHostname(hostname),
    'collaborator-journey creates users, campaigns, agenda events, exams and check-ins; non-loopback BASE_URL is blocked.',
  ).toBe(true);

  const databasePath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
  if (process.env.BASE_URL?.trim()) {
    expect(
      process.env.COLLABORATOR_JOURNEY_EXTERNAL_SAME_DATABASE,
      'external collaborator-journey BASE_URL requires explicit same-database opt-in.',
    ).toBe('1');
    expect(
      path.resolve(process.env.COLLABORATOR_JOURNEY_EXTERNAL_DATABASE_PATH || ''),
      'external collaborator-journey server must attest to the same Playwright database.',
    ).toBe(databasePath);
  }
}

function dateKey(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token).toBeTruthy();
  return token;
}

async function createCompany(
  request: APIRequestContext,
  adminToken: string,
  input: { suffix: string; label: string; cnpjPrefix: string },
): Promise<string> {
  const digits = input.suffix.padStart(8, '0').slice(-8);
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: `Empresa Colab Journey ${input.label} ${input.suffix}`,
      cnpj: `${input.cnpjPrefix}.${digits.slice(0, 3)}.${digits.slice(3, 6)}/0001-${digits.slice(6, 8)}`,
      sector: 'Saude',
      plan: 'pro',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.company.id as string;
}

async function createRoleUser(
  request: APIRequestContext,
  adminToken: string,
  input: {
    companyId: string;
    email: string;
    password: string;
    role: 'rh' | 'colaboradora';
    name: string;
  },
): Promise<string> {
  const response = await request.post('/api/admin/users', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      company_id: input.companyId,
      mustChangePassword: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.id as string;
}

async function createCampaign(
  request: APIRequestContext,
  rhToken: string,
  input: { name: string; month: string; color: string },
): Promise<string> {
  const response = await request.post('/api/campaigns', {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: {
      name: input.name,
      month: input.month,
      color: input.color,
      status: 'active',
      statusLabel: 'Ativa',
      start_date: dateKey(-1),
      end_date: dateKey(30),
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  return body.id as string;
}

test('collaborator-journey setup guard only allows exact loopback hostnames', () => {
  for (const hostname of ['localhost', '[::1]', '127.0.0.1', '127.255.255.255']) {
    expect(isLoopbackHostname(hostname), `${hostname} should be accepted`).toBe(true);
  }

  for (const hostname of ['127.example.com', '127.0.0.1.evil.test', '127.999.0.1', 'empresa.com']) {
    expect(isLoopbackHostname(hostname), `${hostname} should be rejected`).toBe(false);
  }
});

test.describe('Collaborator journey safe parity API smoke', () => {
  test.describe.configure({ mode: 'serial' });

  const suffix = Date.now().toString().slice(-8);
  const password = 'ColabJourney@2026';
  const rhEmail = `rh-colab-journey-${suffix}@empresa.com`;
  const collaboratorEmail = `colab-journey-${suffix}@empresa.com`;
  const foreignRhEmail = `rh-colab-journey-foreign-${suffix}@empresa.com`;
  const foreignCollaboratorEmail = `colab-journey-foreign-${suffix}@empresa.com`;
  const collaboratorName = `Ana Journey ${suffix}`;
  const foreignCollaboratorName = `Bruna Foreign Journey ${suffix}`;
  const ownCampaignName = `Campanha Segura ${suffix}`;
  const foreignCampaignName = `Campanha Estrangeira ${suffix}`;
  const ownAgendaTitle = `Consulta propria ${suffix}`;
  const foreignAgendaTitle = `Consulta estrangeira ${suffix}`;
  const ownExamName = 'Hemograma';
  const foreignExamName = 'Glicemia';

  let adminToken: string;
  let rhToken: string;
  let collaboratorToken: string;
  let foreignRhToken: string;
  let foreignCollaboratorToken: string;
  let ownCampaignId: string;
  let foreignCampaignId: string;
  let ownChallengeId: string;
  let foreignChallengeId: string;

  const foreignCanaries = [
    foreignRhEmail,
    foreignCollaboratorEmail,
    foreignCollaboratorName,
    foreignCampaignName,
    foreignAgendaTitle,
    foreignExamName,
  ];

  test.beforeAll(async ({ request, baseURL }) => {
    assertJourneyMutationEnvironment(baseURL);
    adminToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);

    const companyId = await createCompany(request, adminToken, {
      suffix,
      label: 'A',
      cnpjPrefix: '71',
    });
    const foreignCompanyId = await createCompany(request, adminToken, {
      suffix: `${suffix.slice(0, 7)}9`,
      label: 'B',
      cnpjPrefix: '72',
    });

    await createRoleUser(request, adminToken, {
      companyId,
      email: rhEmail,
      password,
      role: 'rh',
      name: `RH Colab Journey ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: collaboratorEmail,
      password,
      role: 'colaboradora',
      name: collaboratorName,
    });
    await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: foreignRhEmail,
      password,
      role: 'rh',
      name: `RH Foreign Journey ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: foreignCollaboratorEmail,
      password,
      role: 'colaboradora',
      name: foreignCollaboratorName,
    });

    rhToken = await apiLogin(request, rhEmail, password);
    collaboratorToken = await apiLogin(request, collaboratorEmail, password);
    foreignRhToken = await apiLogin(request, foreignRhEmail, password);
    foreignCollaboratorToken = await apiLogin(request, foreignCollaboratorEmail, password);

    ownCampaignId = await createCampaign(request, rhToken, {
      name: ownCampaignName,
      month: 'Jul',
      color: '#3E7D5A',
    });
    foreignCampaignId = await createCampaign(request, foreignRhToken, {
      name: foreignCampaignName,
      month: 'Jul',
      color: '#B45309',
    });
  });

  test('personal home exposes useful journey summary without legacy gamification fields', async ({ request }) => {
    const response = await request.get('/api/collaborator', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(response.ok(), await response.text()).toBe(true);
    expectPrivateResponse(response);
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual([
      'campaignsActive',
      'campaignsTotal',
      'contentViewed',
      'date',
      'examsPercent',
      'examsTotal',
      'greeting',
      'unreadNotifications',
      'userName',
    ]);
    expect(body.userName).toBe('Ana');
    expect(body.campaignsActive).toBeGreaterThanOrEqual(1);
    expect(body.examsTotal).toBe(0);
    expectNoRecursiveKeys(body, /points?|xp|level|league|badges?|ranking|streak/i, foreignCanaries);
  });

  test('campaign journey is company-scoped and join does not reopen reward points', async ({ request }) => {
    const listResponse = await request.get('/api/collaborator/campaigns', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(listResponse.ok(), await listResponse.text()).toBe(true);
    expectPrivateResponse(listResponse);
    const campaigns = await listResponse.json();
    expect(Array.isArray(campaigns)).toBe(true);

    const ownCampaign = campaigns.find((campaign: any) => campaign.id === ownCampaignId);
    expect(ownCampaign).toBeTruthy();
    expect(Object.keys(ownCampaign).sort()).toEqual([
      'color',
      'id',
      'joined',
      'month',
      'name',
      'progress',
      'status',
      'statusLabel',
    ]);
    expect(ownCampaign.name).toBe(ownCampaignName);
    expect(JSON.stringify(campaigns)).not.toContain(foreignCampaignName);

    const joinOwn = await request.post('/api/campaigns/join', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: { campaignId: ownCampaignId },
    });
    expect(joinOwn.ok(), await joinOwn.text()).toBe(true);
    const joinBody = await joinOwn.json();
    expect(joinBody).toEqual({
      success: true,
      progressRecorded: true,
      gamification: {
        status: 'under_review',
        reason: 'eligible_ledger_required',
        message: expect.any(String),
      },
    });
    expectNoRecursiveKeys(joinBody, /points?|xp|level|league|badges?|ranking/i, foreignCanaries);

    const joinForeign = await request.post('/api/campaigns/join', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: { campaignId: foreignCampaignId },
    });
    expect(joinForeign.status()).toBe(404);
  });

  test('agenda and exams stay personal and do not leak another collaborator data', async ({ request }) => {
    const ownAgenda = await request.post('/api/collaborator/agenda', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: {
        title: ownAgendaTitle,
        type: 'consulta',
        date: dateKey(10),
        time: '09:00',
        notes: 'Registro pessoal seguro',
      },
    });
    expect(ownAgenda.ok(), await ownAgenda.text()).toBe(true);

    const foreignAgenda = await request.post('/api/collaborator/agenda', {
      headers: { Cookie: `uniher-access-token=${foreignCollaboratorToken}` },
      data: {
        title: foreignAgendaTitle,
        type: 'consulta',
        date: dateKey(11),
        time: '10:00',
      },
    });
    expect(foreignAgenda.ok(), await foreignAgenda.text()).toBe(true);

    const ownExam = await request.post('/api/collaborator/exams', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: {
        exam_name: ownExamName,
        completed_date: dateKey(-2),
      },
    });
    expect(ownExam.ok(), await ownExam.text()).toBe(true);

    const foreignExam = await request.post('/api/collaborator/exams', {
      headers: { Cookie: `uniher-access-token=${foreignCollaboratorToken}` },
      data: {
        exam_name: foreignExamName,
        completed_date: dateKey(-1),
      },
    });
    expect(foreignExam.ok(), await foreignExam.text()).toBe(true);

    const agendaList = await request.get('/api/collaborator/agenda', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(agendaList.ok(), await agendaList.text()).toBe(true);
    expectPrivateResponse(agendaList);
    const agendaBody = await agendaList.json();
    expect(Object.keys(agendaBody).sort()).toEqual(['events']);
    expect(agendaBody.events.map((event: any) => event.title).sort()).toEqual([ownAgendaTitle]);
    expectNoRecursiveKeys(agendaBody, /user_id|company_id|cpf|email|password/i, foreignCanaries);

    const examList = await request.get('/api/collaborator/exams', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(examList.ok(), await examList.text()).toBe(true);
    expectPrivateResponse(examList);
    const examBody = await examList.json();
    expect(Object.keys(examBody).sort()).toEqual(['exams']);
    expect(examBody.exams.map((exam: any) => exam.exam_name).sort()).toEqual([ownExamName]);
    expectNoRecursiveKeys(examBody, /user_id|company_id|cpf|email|password/i, foreignCanaries);
  });

  test('check-in and streak remain private while ranking and challenges stay contained', async ({ request }) => {
    const checkIn = await request.post('/api/gamification/check-in', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: { mood: 'muito_bem', points: 99999, xp: 99999, level: 99 },
    });
    expect(checkIn.ok(), await checkIn.text()).toBe(true);
    expectPrivateResponse(checkIn);
    const checkInBody = await checkIn.json();
    expect(Object.keys(checkInBody).sort()).toEqual(['alreadyDone', 'newStreak', 'wellbeing']);
    expect(checkInBody.alreadyDone).toBe(false);
    expect(checkInBody.newStreak).toBeGreaterThanOrEqual(1);
    expect(Object.keys(checkInBody.wellbeing).sort()).toEqual(['checkInMood', 'checkedInToday']);
    expect(checkInBody.wellbeing.checkedInToday).toBe(true);
    expectNoRecursiveKeys(checkInBody, /points?|xp|level|league|badges?|ranking/i, foreignCanaries);

    const streak = await request.get('/api/gamification/streak-status', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(streak.ok(), await streak.text()).toBe(true);
    expectPrivateResponse(streak);
    const streakBody = await streak.json();
    expect(Object.keys(streakBody).sort()).toEqual([
      'checkInMood',
      'checkOutMood',
      'checkedInToday',
      'checkedOutToday',
      'streak',
    ]);
    expect(streakBody.checkedInToday).toBe(true);
    expect(streakBody.streak).toBeGreaterThanOrEqual(1);
    expectNoRecursiveKeys(streakBody, /points?|xp|level|league|badges?|ranking/i, foreignCanaries);

    await expectPrivacyReviewResponse(
      await request.get('/api/gamification/leaderboard', {
        headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      }),
      foreignCanaries,
    );

    const ownChallenge = await request.post('/api/collaborator/challenges', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
      data: { catalogKey: 'learning-sprint' },
    });
    expect(ownChallenge.status(), await ownChallenge.text()).toBe(201);
    const ownChallengeBody = await ownChallenge.json();
    expect(Object.keys(ownChallengeBody).sort()).toEqual(['challenge']);
    expect(Object.keys(ownChallengeBody.challenge).sort()).toEqual([
      'catalog_key',
      'challenge',
      'id',
      'progress',
      'status',
    ]);
    expect(ownChallengeBody.challenge.catalog_key).toBe('learning-sprint');
    expect(ownChallengeBody.challenge.status).toBe('joined');
    expect(ownChallengeBody.challenge.progress).toBe(0);
    expectNoRecursiveKeys(
      ownChallengeBody,
      /user_id|company_id|points?|xp|level|league|badges?|ranking|reward|health_scores?|score/i,
      foreignCanaries,
    );
    ownChallengeId = ownChallengeBody.challenge.id;

    const foreignChallenge = await request.post('/api/collaborator/challenges', {
      headers: { Cookie: `uniher-access-token=${foreignCollaboratorToken}` },
      data: { catalogKey: 'focus-sessions' },
    });
    expect(foreignChallenge.status(), await foreignChallenge.text()).toBe(201);
    foreignChallengeId = (await foreignChallenge.json()).challenge.id;

    const challenges = await request.get('/api/collaborator/challenges', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(challenges.ok(), await challenges.text()).toBe(true);
    expectPrivateResponse(challenges);
    const challengesBody = await challenges.json();
    expect(Object.keys(challengesBody).sort()).toEqual(['catalog', 'challenges']);
    expect(Array.isArray(challengesBody.catalog)).toBe(true);
    expect(Array.isArray(challengesBody.challenges)).toBe(true);
    expect(challengesBody.catalog.length).toBeGreaterThan(0);
    expect(challengesBody.challenges.map((challenge: any) => challenge.id)).toEqual([ownChallengeId]);
    expect(challengesBody.challenges[0]).toEqual({
      id: ownChallengeId,
      catalog_key: 'learning-sprint',
      status: 'joined',
      progress: 0,
      challenge: expect.objectContaining({
        key: 'learning-sprint',
        title: expect.any(String),
      }),
    });
    expect(JSON.stringify(challengesBody)).not.toContain(foreignChallengeId);
    for (const item of challengesBody.catalog) {
      expect(Object.keys(item).sort()).toEqual([
        'description',
        'endsAt',
        'isActive',
        'key',
        'mode',
        'startsAt',
        'target',
        'title',
      ]);
    }
    expectNoRecursiveKeys(
      challengesBody,
      /user_id|company_id|points?|xp|level|league|badges?|ranking|reward|health_scores?|score/i,
      foreignCanaries,
    );
  });

  test('personal home reflects completed exams after the journey activity', async ({ request }) => {
    const response = await request.get('/api/collaborator', {
      headers: { Cookie: `uniher-access-token=${collaboratorToken}` },
    });
    expect(response.ok(), await response.text()).toBe(true);
    expectPrivateResponse(response);
    const body = await response.json();
    expect(body.examsTotal).toBe(1);
    expect(body.examsPercent).toBe(100);
    expectNoRecursiveKeys(body, /points?|xp|level|league|badges?|ranking|streak/i, foreignCanaries);
  });
});
