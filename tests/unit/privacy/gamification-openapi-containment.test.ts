import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

type Operation = {
  description?: string;
  security?: Array<Record<string, unknown[]>>;
  summary?: string;
  tags?: string[];
  responses?: Record<string, {
    headers?: Record<string, { schema?: { enum?: string[] } }>;
    content?: Record<string, { schema?: { $ref?: string } }>;
  }>;
};

const expectedMethods = {
  '/admin/badges': ['get', 'post'],
  '/admin/badges/{id}': ['delete', 'patch'],
  '/collaborator/challenges': ['get', 'patch', 'post'],
  '/collaborator/challenges/{id}': ['patch'],
  '/collaborator/badges': ['get'],
  '/collaborator/leagues': ['get'],
  '/objectives': ['get'],
  '/objectives/{id}/claim': ['post'],
  '/badges': ['get'],
  '/gamification/journey': ['get'],
  '/gamification/leaderboard': ['get'],
  '/gamification/league': ['get'],
  '/gamification/rewards': ['get', 'post'],
  '/gamification/rewards/redeem': ['post'],
  '/gamification/rewards/redemptions': ['get', 'patch'],
  '/rh/challenges': ['get', 'post'],
  '/rh/challenges/{id}': ['delete', 'patch'],
  '/rh/leagues': ['get', 'post'],
  '/rh/leagues/{id}': ['delete', 'patch'],
  '/rh/leagues/{id}/join': ['delete', 'post'],
  '/rh/objectives': ['get', 'post'],
  '/rh/objectives/{id}': ['delete', 'patch'],
} as const;

const semaforoMethods = {
  '/collaborator/semaforo': { method: 'get', status: '200' },
  '/collaborator/semaforo/history': { method: 'get', status: '200' },
  '/collaborator/semaforo/recalculate': { method: 'post', status: '423' },
} as const;

const containedTags = [
  'Admin - Badges',
  'Colaboradora - Desafios',
  'Colaboradora - Conquistas',
  'Colaboradora - Liga',
  'Objetivos e Recompensas',
  'RH - Desafios',
  'RH - Ligas',
  'RH - Objetivos',
] as const;

const alternativeAuth = [{ cookieAuth: [] }, { bearerAuth: [] }];

function expectPrivateResponse(operation: Operation, status: string, schema: string) {
  expect(operation.security).toEqual(alternativeAuth);
  expect(Object.keys(operation.responses ?? {})).toEqual([status]);

  const response = operation.responses?.[status];
  expect(response?.headers?.['Cache-Control']?.schema?.enum).toEqual(['private, no-store']);
  expect(response?.headers?.Vary?.schema?.enum).toEqual(['Cookie']);
  expect(response?.content?.['application/json']?.schema?.$ref).toBe(schema);
}

describe('legacy gamification OpenAPI containment', () => {
  it('documents the exact runtime methods with only the privacy-review response', () => {
    const document = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'api-docs.json'), 'utf8')) as {
      paths: Record<string, Record<string, Operation>>;
      tags: Array<{ name: string; description: string }>;
    };

    for (const [route, methods] of Object.entries(expectedMethods)) {
      expect(Object.keys(document.paths[route]).sort(), route).toEqual([...methods].sort());

      for (const method of methods) {
        const operation = document.paths[route][method];
        expect(operation.summary, `${method.toUpperCase()} ${route}`).toMatch(/privacy review/i);
        expect(operation.description, `${method.toUpperCase()} ${route}`).toMatch(/legacy contract contained/i);
        expectPrivateResponse(operation, '410', '#/components/schemas/PrivacyReviewResponse');
      }
    }

    for (const [route, contract] of Object.entries(semaforoMethods)) {
      expect(Object.keys(document.paths[route]), route).toEqual([contract.method]);
      const operation = document.paths[route][contract.method];
      expect(operation.summary, route).toMatch(/privacy review/i);
      expect(operation.description, route).toMatch(/neutral review state/i);
      expectPrivateResponse(operation, contract.status, '#/components/schemas/SemaforoReviewResponse');
    }

    const tagDescriptions = new Map(document.tags.map((tag) => [tag.name, tag.description]));
    for (const tag of containedTags) {
      expect(tagDescriptions.get(tag), tag).toMatch(/privacy review/i);
    }
    expect(tagDescriptions.get('Gamificação')).toMatch(/contained during privacy review/i);
  });
});
