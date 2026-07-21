import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type OpenApiSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

type OpenApiDocument = {
  components: { schemas: Record<string, OpenApiSchema> };
  paths: Record<string, {
    get?: {
      security?: Array<Record<string, unknown[]>>;
      responses?: Record<string, unknown>;
    };
  }>;
};

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('collaborator company identity documentation parity', () => {
  it('documents the runtime route with OR auth and an exact closed identity allowlist', () => {
    const runtimePath = 'src/app/api/collaborator/company/route.ts';
    expect(fs.existsSync(path.join(root, runtimePath))).toBe(true);

    const runtimeSource = read(runtimePath);
    expect(runtimeSource).toContain('export const GET = withAuth');
    expect(runtimeSource).toContain('SELECT id, name, trade_name, logo_url');

    const openApi = JSON.parse(read('public/api-docs.json')) as OpenApiDocument;
    const operation = openApi.paths['/collaborator/company']?.get;
    expect(operation).toBeDefined();
    expect(operation?.security).toEqual([
      { cookieAuth: [] },
      { bearerAuth: [] },
    ]);
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      '200',
      '401',
      '403',
      '404',
    ]);
    expect(operation?.responses?.['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CollaboratorCompanyIdentityResponse' },
        },
      },
    });
    expect(operation?.responses?.['403']).toMatchObject({
      description: expect.stringContaining('COLLABORATOR_CAPABILITY_REQUIRED'),
    });
    expect(operation?.responses?.['404']).toMatchObject({
      description: expect.stringContaining('COMPANY_NOT_FOUND'),
    });

    const identity = openApi.components.schemas.CollaboratorCompanyIdentity;
    expect(identity).toBeDefined();
    expect(identity.required).toEqual(['id', 'name', 'trade_name', 'logo_url']);
    expect(Object.keys(identity.properties ?? {})).toEqual([
      'id',
      'name',
      'trade_name',
      'logo_url',
    ]);
    expect(identity.additionalProperties).toBe(false);

    const response = openApi.components.schemas.CollaboratorCompanyIdentityResponse;
    expect(response).toMatchObject({ required: ['company'], additionalProperties: false });
    expect(Object.keys(response.properties ?? {})).toEqual(['company']);
    expect(response.properties?.company).toEqual({
      $ref: '#/components/schemas/CollaboratorCompanyIdentity',
    });

    const criticalApiDocs = read('docs/APIS_CRITICAS.md');
    expect(criticalApiDocs).toContain('`GET /api/collaborator/company`');
    expect(criticalApiDocs).toContain('`id`, `name`, `trade_name` e `logo_url`');
  });
});
