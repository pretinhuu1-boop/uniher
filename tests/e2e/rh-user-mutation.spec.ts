import { expect, test, type APIRequestContext } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

function assertMutationBaseUrlIsLocal(baseURL?: string) {
  if (process.env.ALLOW_RH_USER_MUTATION_EXTERNAL === '1') return;
  expect(baseURL, 'rh-user-mutation requires Playwright baseURL').toBeTruthy();
  const hostname = new URL(baseURL!).hostname;
  const isLoopback = hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.');
  expect(
    isLoopback,
    'rh-user-mutation creates and mutates users; set ALLOW_RH_USER_MUTATION_EXTERNAL=1 for non-loopback targets.',
  ).toBe(true);
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

async function createCompany(request: APIRequestContext, adminToken: string, suffix: string): Promise<string> {
  const cnpjDigits = suffix.padStart(8, '0').slice(-8);
  const response = await request.post('/api/admin/companies', {
    headers: { Cookie: `uniher-access-token=${adminToken}` },
    data: {
      name: `Empresa RH Mutation ${suffix}`,
      cnpj: `66.${cnpjDigits.slice(0, 3)}.${cnpjDigits.slice(3, 6)}/0001-${cnpjDigits.slice(6, 8)}`,
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
    role: 'rh' | 'lideranca' | 'colaboradora';
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

async function patchRhUser(
  request: APIRequestContext,
  rhToken: string,
  userId: string,
  data: Record<string, unknown>,
) {
  return request.patch(`/api/rh/users/${userId}`, {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
    data,
  });
}

async function getRhUsers(request: APIRequestContext, rhToken: string, query = '') {
  const response = await request.get(`/api/rh/users${query}`, {
    headers: { Cookie: `uniher-access-token=${rhToken}` },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test.describe('RH user mutation API parity', () => {
  test.describe.configure({ mode: 'serial' });

  const suffix = Date.now().toString().slice(-8);
  const password = 'RhMutation@2026';
  const rhEmail = `rh-mut-${suffix}@empresa.com`;
  const foreignRhEmail = `rh-mut-foreign-${suffix}@empresa.com`;
  const collaboratorEmail = `colab-mut-${suffix}@empresa.com`;
  const foreignCollaboratorEmail = `colab-mut-foreign-${suffix}@empresa.com`;
  const updatedName = `Colab Mut Atualizada ${suffix}`;

  let adminToken: string;
  let rhToken: string;
  let foreignRhToken: string;
  let collaboratorId: string;
  let foreignCollaboratorId: string;
  let departmentAId: string;
  let departmentBId: string;
  let foreignDepartmentId: string;

  test.beforeAll(async ({ request, baseURL }) => {
    assertMutationBaseUrlIsLocal(baseURL);
    adminToken = await apiLogin(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const companyId = await createCompany(request, adminToken, suffix);
    const foreignCompanyId = await createCompany(request, adminToken, `${suffix}7`);

    await createRoleUser(request, adminToken, {
      companyId,
      email: rhEmail,
      password,
      role: 'rh',
      name: `RH Mutation ${suffix}`,
    });
    await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: foreignRhEmail,
      password,
      role: 'rh',
      name: `RH Mutation Foreign ${suffix}`,
    });
    collaboratorId = await createRoleUser(request, adminToken, {
      companyId,
      email: collaboratorEmail,
      password,
      role: 'colaboradora',
      name: `Colab Mutation ${suffix}`,
    });
    foreignCollaboratorId = await createRoleUser(request, adminToken, {
      companyId: foreignCompanyId,
      email: foreignCollaboratorEmail,
      password,
      role: 'colaboradora',
      name: `Colab Mutation Foreign ${suffix}`,
    });

    rhToken = await apiLogin(request, rhEmail, password);
    foreignRhToken = await apiLogin(request, foreignRhEmail, password);
    departmentAId = await createDepartment(request, rhToken, `Mutation Produto ${suffix}`);
    departmentBId = await createDepartment(request, rhToken, `Mutation Operacoes ${suffix}`);
    foreignDepartmentId = await createDepartment(request, foreignRhToken, `Mutation Foreign ${suffix}`);

    const assignInitial = await patchRhUser(request, rhToken, collaboratorId, {
      action: 'update_profile',
      department_id: departmentAId,
    });
    expect(assignInitial.ok(), await assignInitial.text()).toBe(true);
  });

  test('RH updates same-company collaborator profile, department and safe role', async ({ request }) => {
    const response = await patchRhUser(request, rhToken, collaboratorId, {
      action: 'update_profile',
      name: updatedName,
      role: 'lideranca',
      department_id: departmentBId,
    });

    expect(response.ok(), await response.text()).toBe(true);
    const body = await getRhUsers(request, rhToken, `?search=${encodeURIComponent(updatedName)}`);
    expect(body.users).toEqual([
      expect.objectContaining({
        id: collaboratorId,
        name: updatedName,
        email: collaboratorEmail,
        role: 'lideranca',
        department_id: departmentBId,
        blocked: 0,
      }),
    ]);
  });

  test('RH blocks and unblocks same-company collaborator without crossing tenants', async ({ request }) => {
    const blockResponse = await patchRhUser(request, rhToken, collaboratorId, { action: 'block' });
    expect(blockResponse.ok(), await blockResponse.text()).toBe(true);

    const blockedBody = await getRhUsers(request, rhToken, `?status=blocked&search=${encodeURIComponent(collaboratorEmail)}`);
    expect(blockedBody.users).toEqual([
      expect.objectContaining({ id: collaboratorId, blocked: 1 }),
    ]);

    const unblockResponse = await patchRhUser(request, rhToken, collaboratorId, { action: 'unblock' });
    expect(unblockResponse.ok(), await unblockResponse.text()).toBe(true);

    const activeBody = await getRhUsers(request, rhToken, `?status=active&search=${encodeURIComponent(collaboratorEmail)}`);
    expect(activeBody.users).toEqual([
      expect.objectContaining({ id: collaboratorId, blocked: 0 }),
    ]);
  });

  test('RH cannot assign a collaborator to a department from another company', async ({ request }) => {
    const response = await patchRhUser(request, rhToken, collaboratorId, {
      action: 'update_profile',
      department_id: foreignDepartmentId,
    });

    expect(response.status()).toBe(404);
    const body = await getRhUsers(request, rhToken, `?search=${encodeURIComponent(collaboratorEmail)}`);
    expect(body.users).toEqual([
      expect.objectContaining({
        id: collaboratorId,
        department_id: departmentBId,
      }),
    ]);
  });

  test('RH cannot mutate a user from another company', async ({ request }) => {
    const response = await patchRhUser(request, rhToken, foreignCollaboratorId, {
      action: 'update_profile',
      name: `Leaked Mutation ${suffix}`,
      department_id: departmentAId,
    });

    expect(response.status()).toBe(403);
    const mainBody = await getRhUsers(request, rhToken, `?search=${encodeURIComponent(foreignCollaboratorEmail)}`);
    expect(mainBody.users).toEqual([]);

    const foreignBody = await getRhUsers(request, foreignRhToken, `?search=${encodeURIComponent(foreignCollaboratorEmail)}`);
    expect(foreignBody.users).toEqual([
      expect.objectContaining({
        id: foreignCollaboratorId,
        name: `Colab Mutation Foreign ${suffix}`,
        department_id: null,
      }),
    ]);

    const inverseForeignBody = await getRhUsers(request, foreignRhToken, `?search=${encodeURIComponent(collaboratorEmail)}`);
    expect(inverseForeignBody.users).toEqual([]);
  });
});
