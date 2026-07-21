import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

type Operation = {
  summary?: string;
  responses?: Record<string, {
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
  '/gamification/league': ['get'],
  '/rh/challenges': ['get', 'post'],
  '/rh/challenges/{id}': ['delete', 'patch'],
  '/rh/leagues': ['get', 'post'],
  '/rh/leagues/{id}': ['delete', 'patch'],
  '/rh/leagues/{id}/join': ['delete', 'post'],
  '/rh/objectives': ['get', 'post'],
  '/rh/objectives/{id}': ['delete', 'patch'],
} as const;

describe('legacy gamification OpenAPI containment', () => {
  it('documents the exact runtime methods with only the privacy-review response', () => {
    const document = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'api-docs.json'), 'utf8')) as {
      paths: Record<string, Record<string, Operation>>;
    };

    for (const [route, methods] of Object.entries(expectedMethods)) {
      expect(Object.keys(document.paths[route]).sort(), route).toEqual([...methods].sort());

      for (const method of methods) {
        const operation = document.paths[route][method];
        expect(operation.summary, `${method.toUpperCase()} ${route}`).toMatch(/privacy review/i);
        expect(Object.keys(operation.responses ?? {})).toEqual(['410']);
        expect(operation.responses?.['410']?.content?.['application/json']?.schema?.$ref)
          .toBe('#/components/schemas/PrivacyReviewResponse');
      }
    }
  });
});
