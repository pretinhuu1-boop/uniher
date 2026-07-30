import { expect, test, type APIRequestContext } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const token = extractAccessTokenFromSetCookie(response);
  expect(token).toBeTruthy();
  return token;
}

async function createCompany(request: APIRequestContext, adminToken: string, suffix: string): Promise<string> {
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: `Empresa Invite Scope ${suffix}`,
      cnpj: `55.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
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
  input: { companyId: string; email: string; password: string; role: 'rh' | 'lideranca'; name: string },
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
      also_collaborator: input.role === 'lideranca',
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  return body.id as string;
}

async function createDepartment(request: APIRequestContext, rhToken: string, name: string): Promise<string> {
  const response = await request.post('/api/departments', {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: { name },
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();
  return body.id as string;
}

async function assignDepartment(request: APIRequestContext, rhToken: string, userId: string, departmentId: string) {
  const response = await request.patch(`/api/rh/users/${userId}`, {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: {
      action: 'update_profile',
      department_id: departmentId,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function createInvite(
  request: APIRequestContext,
  rhToken: string,
  email: string,
  departmentId: string,
) {
  const response = await request.post('/api/invites', {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data: {
      email,
      role: 'colaboradora',
      department_id: departmentId,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe('Invite scope API parity', () => {
  test.describe.configure({ mode: 'serial' });

  const suffix = Date.now().toString().slice(-8);
  const password = 'InviteScope@2026';
  const rhEmail = `rh-invite-${suffix}@empresa.com`;
  const leaderEmail = `leader-invite-${suffix}@empresa.com`;
  const leaderNoDeptEmail = `leader-nodept-${suffix}@empresa.com`;
  const deptAInviteEmail = `invite-dept-a-${suffix}@empresa.com`;
  const deptBInviteEmail = `invite-dept-b-${suffix}@empresa.com`;
  const foreignInviteEmail = `invite-foreign-${suffix}@empresa.com`;

  let adminToken: string;
  let rhToken: string;
  let leaderToken: string;
  let leaderNoDeptToken: string;
  let departmentAId: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const companyId = await createCompany(request, adminToken, suffix);
    const foreignCompanyId = await createCompany(request, adminToken, `${suffix}9`);
    const rhId = await createRoleUser(request, adminToken, {
      companyId,
      email: rhEmail,
      password,
      role: 'rh',
      name: `RH Invite ${suffix}`,
    });
    const leaderId = await createRoleUser(request, adminToken, {
      companyId,
      email: leaderEmail,
      password,
      role: 'lideranca',
      name: `Leader Invite ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId,
      email: leaderNoDeptEmail,
      password,
      role: 'lideranca',
      name: `Leader No Dept ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: `rh-foreign-${suffix}@empresa.com`,
      password,
      role: 'rh',
      name: `RH Foreign ${suffix}`,
    });

    expect(rhId).toBeTruthy();
    rhToken = await apiLogin(request, rhEmail, password);
    departmentAId = await createDepartment(request, rhToken, `Invite Produto ${suffix}`);
    const departmentBId = await createDepartment(request, rhToken, `Invite Operacoes ${suffix}`);
    await assignDepartment(request, rhToken, leaderId, departmentAId);
    await createInvite(request, rhToken, deptAInviteEmail, departmentAId);
    await createInvite(request, rhToken, deptBInviteEmail, departmentBId);

    const foreignRhToken = await apiLogin(request, `rh-foreign-${suffix}@empresa.com`, password);
    const foreignDepartmentId = await createDepartment(request, foreignRhToken, `Invite Foreign ${suffix}`);
    await createInvite(request, foreignRhToken, foreignInviteEmail, foreignDepartmentId);

    leaderToken = await apiLogin(request, leaderEmail, password);
    leaderNoDeptToken = await apiLogin(request, leaderNoDeptEmail, password);
  });

  test('RH sees all pending company invites across departments', async ({ request }) => {
    const response = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${rhToken}` },
    });

    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    const emails = body.invites.map((invite: { email: string }) => invite.email).sort();
    expect(emails).toEqual([deptAInviteEmail, deptBInviteEmail].sort());
    expect(emails).not.toContain(foreignInviteEmail);
  });

  test('Leadership sees only pending invites for its own department', async ({ request }) => {
    const response = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${leaderToken}` },
    });

    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    expect(body.invites).toHaveLength(1);
    expect(body.invites).toEqual([
      expect.objectContaining({
        email: deptAInviteEmail,
        department_id: departmentAId,
      }),
    ]);
    const emails = body.invites.map((invite: { email: string }) => invite.email);
    expect(emails).not.toContain(deptBInviteEmail);
    expect(emails).not.toContain(foreignInviteEmail);
  });

  test('Leadership without department gets an empty invite list', async ({ request }) => {
    const response = await request.get('/api/invites', {
      headers: { Cookie: `uniher-access-token=${leaderNoDeptToken}` },
    });

    expect(response.ok(), await response.text()).toBe(true);
    await expect(response.json()).resolves.toEqual({ invites: [] });
  });
});
