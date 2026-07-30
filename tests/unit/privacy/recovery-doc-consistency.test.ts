import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('recovery documentation consistency', () => {
  it('does not describe locally fixed P1 reset delivery as still pending', () => {
    const fullGapMap = read('docs/superpowers/audits/2026-07-29-uniher-full-gap-map-after-main-merge.md');
    const parityMatrix = read('docs/superpowers/audits/2026-07-29-uniher-safe-parity-matrix.md');

    expect(fullGapMap).toContain('Fixed locally in WB-03');
    expect(fullGapMap).toContain('local P1/P2 repairs are now covered by WB-03');
    expect(fullGapMap).not.toContain('Replace with one-time reset flow or secure out-of-band delivery; do not return password.');
    expect(fullGapMap).not.toContain('P1: DSAR linkage for imported identity profiles may miss self-export');
    expect(fullGapMap).not.toContain('The missing work is: safe rebuild or explicit removal of old gamification promises, operational completion of sensitive modules, P1 security/privacy fixes');

    expect(parityMatrix).toContain('Preserve WB-03');
    expect(parityMatrix).toContain('tests/unit/privacy/password-reset-delivery.test.ts');
    expect(parityMatrix).not.toContain('Add failing test that RH/Admin reset response does not include `temporaryPassword`');
  });
});
