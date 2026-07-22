import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { PRIVACY_REVIEW_BODY } from '@/lib/privacy/api-response';

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: unknown[]) => unknown) => handler;
  return {
    withAuth: expose,
    withRole: () => expose,
    withMasterAdmin: expose,
  };
});

vi.mock('@/lib/db', () => ({
  getReadDb: () => { throw new Error('database opened before privacy containment'); },
  getWriteQueue: () => { throw new Error('write queue opened before privacy containment'); },
}));
vi.mock('@/lib/db/init', () => ({
  initDb: () => { throw new Error('database initialized before privacy containment'); },
}));

import * as leaderboard from '@/app/api/gamification/leaderboard/route';
import * as league from '@/app/api/gamification/league/route';
import * as journey from '@/app/api/gamification/journey/route';
import * as rewards from '@/app/api/gamification/rewards/route';
import * as rewardRedeem from '@/app/api/gamification/rewards/redeem/route';
import * as redemptions from '@/app/api/gamification/rewards/redemptions/route';
import * as collaboratorLeagues from '@/app/api/collaborator/leagues/route';
import * as rhLeagues from '@/app/api/rh/leagues/route';
import * as rhLeague from '@/app/api/rh/leagues/[id]/route';
import * as rhLeagueJoin from '@/app/api/rh/leagues/[id]/join/route';
import * as badges from '@/app/api/badges/route';
import * as collaboratorBadges from '@/app/api/collaborator/badges/route';
import * as adminBadges from '@/app/api/admin/badges/route';
import * as adminBadge from '@/app/api/admin/badges/[id]/route';
import * as objectives from '@/app/api/objectives/route';
import * as objectiveClaim from '@/app/api/objectives/[id]/claim/route';
import * as rhObjectives from '@/app/api/rh/objectives/route';
import * as rhObjective from '@/app/api/rh/objectives/[id]/route';
import * as rhChallenges from '@/app/api/rh/challenges/route';
import * as rhChallenge from '@/app/api/rh/challenges/[id]/route';

type RouteHandler = (request: NextRequest, context: Record<string, unknown>) => Promise<Response> | Response;

const routes: Array<[string, Record<string, unknown>, string[]]> = [
  ['/api/gamification/leaderboard', leaderboard, ['GET']],
  ['/api/gamification/league', league, ['GET']],
  ['/api/gamification/journey', journey, ['GET']],
  ['/api/gamification/rewards', rewards, ['GET', 'POST']],
  ['/api/gamification/rewards/redeem', rewardRedeem, ['POST']],
  ['/api/gamification/rewards/redemptions', redemptions, ['GET', 'PATCH']],
  ['/api/collaborator/leagues', collaboratorLeagues, ['GET']],
  ['/api/rh/leagues', rhLeagues, ['GET', 'POST']],
  ['/api/rh/leagues/:id', rhLeague, ['PATCH', 'DELETE']],
  ['/api/rh/leagues/:id/join', rhLeagueJoin, ['POST', 'DELETE']],
  ['/api/badges', badges, ['GET']],
  ['/api/collaborator/badges', collaboratorBadges, ['GET']],
  ['/api/admin/badges', adminBadges, ['GET', 'POST']],
  ['/api/admin/badges/:id', adminBadge, ['PATCH', 'DELETE']],
  ['/api/objectives', objectives, ['GET']],
  ['/api/objectives/:id/claim', objectiveClaim, ['POST']],
  ['/api/rh/objectives', rhObjectives, ['GET', 'POST']],
  ['/api/rh/objectives/:id', rhObjective, ['PATCH', 'DELETE']],
  ['/api/rh/challenges', rhChallenges, ['GET', 'POST']],
  ['/api/rh/challenges/:id', rhChallenge, ['PATCH', 'DELETE']],
];

describe('legacy gamification API containment', () => {
  it.each(routes)('%s returns the shared unavailable response for every exported method before DB access', async (pathname, module, methods) => {
    for (const method of methods) {
      const handler = module[method] as RouteHandler;
      expect(handler, `${pathname} ${method}`).toBeTypeOf('function');
      const response = await handler(
        new Request(`http://localhost${pathname.replace(':id', 'legacy-id')}`, {
          method,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? '{}' : undefined,
          headers: { 'content-type': 'application/json' },
        }) as unknown as NextRequest,
        {
          auth: { userId: 'user-1', role: 'admin', companyId: 'company-1', email: 'user@example.test' },
          params: Promise.resolve({ id: 'legacy-id' }),
        },
      );

      expect(response.status, `${pathname} ${method}`).toBe(410);
      expect(await response.json(), `${pathname} ${method}`).toEqual(PRIVACY_REVIEW_BODY);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });
});
