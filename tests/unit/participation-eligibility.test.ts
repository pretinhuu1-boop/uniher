import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertEligibleParticipation,
  createParticipationEventKey,
  FORBIDDEN_PARTICIPATION_SOURCES,
  PARTICIPATION_EVENT_RETENTION_DAYS_AFTER_CLOSE,
} from '@/lib/participation/eligibility';
import {
  ELIGIBLE_PARTICIPATION_EVENTS,
  PARTICIPATION_ELIGIBILITY_VERSION,
} from '@/types/participation';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('eligible participation policy', () => {
  it('approves only the conservative v1 event allowlist', () => {
    expect(ELIGIBLE_PARTICIPATION_EVENTS).toEqual([
      'content_completed',
      'objective_started',
      'objective_progressed',
      'objective_completed',
      'challenge_joined',
      'challenge_progressed',
      'challenge_completed',
      'challenge_left',
    ]);
    expect(PARTICIPATION_ELIGIBILITY_VERSION).toBe('participation-v1');
    expect(PARTICIPATION_EVENT_RETENTION_DAYS_AFTER_CLOSE).toBe(90);
  });

  it('rejects arbitrary events, mismatched source domains and empty identifiers', () => {
    const base = {
      companyId: 'company-1',
      userId: 'user-1',
      eventType: 'objective_started',
      sourceDomain: 'personal_objective',
      sourceId: 'objective-1',
      mutationId: 'mutation-1',
    };

    expect(() => assertEligibleParticipation(base)).not.toThrow();
    expect(() => assertEligibleParticipation({ ...base, eventType: 'points_awarded' }))
      .toThrow(/Unsupported participation event/);
    expect(() => assertEligibleParticipation({ ...base, sourceDomain: 'company_challenge' }))
      .toThrow(/cannot be produced/);
    expect(() => assertEligibleParticipation({ ...base, sourceId: ' ' }))
      .toThrow(/requires company, user, event, source and mutation/);
  });

  it.each(FORBIDDEN_PARTICIPATION_SOURCES)('rejects forbidden source %s', (sourceDomain) => {
    expect(() => assertEligibleParticipation({
      companyId: 'company-1',
      userId: 'user-1',
      eventType: 'objective_started',
      sourceDomain,
      sourceId: 'source-1',
      mutationId: 'mutation-1',
    })).toThrow(/Forbidden participation source|Unsupported participation source/);
  });

  it('rejects free-form metadata in v1', () => {
    expect(() => assertEligibleParticipation({
      companyId: 'company-1',
      userId: 'user-1',
      eventType: 'challenge_joined',
      sourceDomain: 'company_challenge',
      sourceId: 'challenge-1',
      mutationId: 'mutation-1',
      metadata: { note: 'free text is not allowed' },
    })).toThrow(/metadata is disabled/);
  });

  it('derives a stable event key from the immutable mutation tuple', () => {
    const input = {
      companyId: 'company-1',
      userId: 'user-1',
      eventType: 'objective_progressed',
      sourceDomain: 'personal_objective',
      sourceId: 'objective-1',
      mutationId: 'mutation-1',
    };

    const first = createParticipationEventKey(input);
    const retry = createParticipationEventKey(input);
    const nextMutation = createParticipationEventKey({ ...input, mutationId: 'mutation-2' });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(retry).toBe(first);
    expect(nextMutation).not.toBe(first);
  });

  it('keeps the service free of generic public writer naming', () => {
    const serviceSource = read('src/services/participation.service.ts');
    expect(serviceSource).toContain('recordObjectiveStarted');
    expect(serviceSource).toContain('recordChallengeLeft');
    expect(serviceSource).not.toMatch(/export\s+(?:async\s+)?function\s+recordEvent\b/);
    expect(serviceSource).not.toContain('getWriteQueue');
    expect(serviceSource).not.toMatch(/export\s+async\s+function\s+recordObjectiveStarted\b/);
    expect(serviceSource).not.toMatch(/export\s+async\s+function\s+recordChallengeJoined\b/);
    expect(serviceSource).not.toMatch(/content_completed[\s\S]*recordContentCompleted/);
  });

  it('wires fulfilled user deletes to participation hard-delete receipts', () => {
    const adminDeleteRoute = read('src/app/api/admin/users/[id]/route.ts');
    const rhDeleteRoute = read('src/app/api/rh/users/[id]/route.ts');

    for (const source of [adminDeleteRoute, rhDeleteRoute]) {
      expect(source).toContain('createParticipationRepository');
      expect(source).toContain('hardDeleteUserEventsInCurrentTransaction');
      expect(source).toMatch(/transaction\(\(\) =>/);
    }
  });
});
