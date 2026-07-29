# UniHER Wave 7 scorecard count correction plan

**Date:** 2026-07-23
**Status:** executed
**Wave:** wave7-challenges
**Current decision:** PASS with P3 docs finding
**Finding source:** separate Wave 7 audit session

## Finding

P3: Wave 7 scorecard test count is stale.

The scorecard declares 52 tests, while the fresh audit ran the focused suite with 53 tests passing.

## Harness

**Write allowlist:**

- `docs/superpowers/audits/2026-07-22-uniher-wave7-challenges-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` only if it repeats the stale count

**Write denylist:**

- no source code changes
- no route/API behavior changes

## Tasks

- [x] Locate the stale `52 tests` wording in the Wave 7 scorecard.
- [x] Update it to the fresh observed count if the same command is rerun and passes.
- [x] Add a receipt line with the exact command and date.

## Execution Receipt

```powershell
npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
```

Result on 2026-07-23: PASS, 5 files, 53 tests.

## Verification

Run:

```powershell
npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
git diff --check -- docs/superpowers/audits/2026-07-22-uniher-wave7-challenges-scorecard.md docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md
```

## Pass Gate

- Scorecard evidence count matches the fresh command output.
- No product behavior changes.
