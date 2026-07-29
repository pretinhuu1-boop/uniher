import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('recovery production hold boundary', () => {
  it('keeps production promotion blocked until target host evidence exists', () => {
    const fullGapMap = read('docs/superpowers/audits/2026-07-29-uniher-full-gap-map-after-main-merge.md');
    const goalPlan = read('docs/superpowers/plans/2026-07-29-uniher-safe-parity-recovery-goal-plan.md');
    const ledger = read('docs/superpowers/plans/2026-07-29-uniher-wave-b-implementation-ledger.md');
    const releaseScript = read('scripts/check-release-env.cjs');
    const packageJson = read('package.json');
    const recoveryDocs = `${fullGapMap}\n${goalPlan}\n${ledger}`;

    expect(packageJson).toContain('"check:release-env": "node scripts/check-release-env.cjs"');
    expect(releaseScript).toContain('ACCESS_TOKEN_BLACKLIST');
    expect(releaseScript).toContain('UNIHER_RELEASE_SMOKE_ACCOUNTS');
    expect(releaseScript).toContain('UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET');
    expect(releaseScript).toContain('process.exit(1)');

    expect(recoveryDocs).toContain('Do not deploy or claim production readiness inside this goal.');
    expect(recoveryDocs).toContain('No deploy or production claim from this ledger.');
    expect(fullGapMap).toContain('Production remains HOLD until the host/runtime gate is proven with current target evidence.');
    expect(fullGapMap).toContain('Production stays HOLD until this checklist has fresh target evidence:');
    expect(fullGapMap).toContain('Redacted `npm run check:release-env` PASS on target host');
    expect(fullGapMap).toContain('Authenticated smoke');
    expect(fullGapMap).toContain('Only after local P1/P2 repairs are preserved and host gates pass, promote a production candidate.');

    expect(recoveryDocs).not.toMatch(/production (?:is )?(?:ready|approved|promoted|released)/i);
    expect(recoveryDocs).not.toMatch(/deploy (?:approved|ready|released)/i);
  });
});
