import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const landingFreezeBaseline = '0fb1d517d9ce91cdab1db3703f33f2611d31abfa';

const frozenLandingPaths = [
  'src/app/layout.tsx',
  'src/app/proposta/page.tsx',
  'src/app/welcome-colaboradora/quiz/page.tsx',
  'src/app/welcome/page.tsx',
  'src/components/layout/Marquee.tsx',
  'src/components/layout/Navbar.tsx',
  'src/components/sections/QuizPromo.tsx',
  'src/components/sections/ROI.tsx',
];

function changedFrozenPaths(args: string[]): string[] {
  const output = execFileSync('git', [...args, '--', ...frozenLandingPaths], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalized(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

describe('landing freeze boundary', () => {
  it('keeps the current public landing untouched in this parity wave', () => {
    expect(changedFrozenPaths(['diff', '--name-only'])).toEqual([]);
    expect(changedFrozenPaths(['diff', '--cached', '--name-only'])).toEqual([]);

    for (const relativePath of frozenLandingPaths) {
      const current = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
      const frozen = execFileSync('git', ['show', `${landingFreezeBaseline}:${relativePath}`], {
        cwd: process.cwd(),
        encoding: 'utf8',
      });

      expect(normalized(current), relativePath).toBe(normalized(frozen));
    }
  });
});
