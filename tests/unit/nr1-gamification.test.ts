import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('NR-1 gamification containment', () => {
  it('keeps COPSOQ completion disconnected from legacy gamification writes', () => {
    const route = read('src/app/api/yavix/copsoq/submit/route.ts');
    const service = read('src/services/gamification.service.ts');

    expect(route).not.toMatch(/awardNr1Completion|gamification\.service|xpEarned|alreadyAwarded/);
    expect(service).not.toMatch(/awardNr1Completion|checkParticipationBadges|earn_points_nr1_completed|nr1_assessment/);
  });

  it('returns a neutral completion contract and renders no reward celebration', () => {
    const types = read('src/lib/yavix/copsoq.types.ts');
    const hook = read('src/hooks/useCopsoq.ts');
    const flow = read('src/components/copsoq/CopsoqFlow.tsx');

    expect(types).not.toMatch(/xpEarned|alreadyAwarded/);
    expect(hook).not.toMatch(/xpEarned|alreadyAwarded|reward:/);
    expect(flow).not.toMatch(/XP por participar|xpEarned|alreadyAwarded/);
  });
});
