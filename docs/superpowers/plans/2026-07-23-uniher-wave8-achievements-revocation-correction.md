# UniHER Wave 8 achievements revocation correction plan

**Date:** 2026-07-23
**Status:** executed
**Wave:** wave8-achievements
**Current decision:** HOLD
**Finding source:** separate Wave 8 audit session

## Finding

P1: achievement revocation is not idempotent.

Observed mechanism:

- `src/services/private-achievements.service.ts` derives `status: event ? 'earned' : 'in_progress'`.
- `src/repositories/achievements.repository.ts` upsert writes `status = excluded.status`.
- The repository only converts `earned -> in_progress` into `revoked`.
- After the first revocation sync stores `revoked`, a later sync without the qualifying event can overwrite it to `in_progress`.
- Existing test covers the first sync after revocation, not repeated sync persistence.

P2: mobile bottom evidence for `/conquistas` is weak because top/bottom screenshots are byte-identical.

## Harness

**Write allowlist:**

- `src/repositories/achievements.repository.ts`
- `src/services/private-achievements.service.ts` only if the cleaner fix belongs in service logic
- `tests/unit/private-achievements.test.ts`
- `docs/superpowers/audits/2026-07-22-uniher-wave8-achievements-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Obsidian Paola/UniHER mission note if the coordinator wants a durable receipt

**Write denylist:**

- no legacy badges, `user_badges`, `badges`, `points`, `week_points` or ranking behavior
- no Semaforo, NR-1, agenda, exam or health data inputs
- no schema migration unless a direct proof shows it is unavoidable
- no route redesign

## Tasks

- [x] Add a RED regression in `tests/unit/private-achievements.test.ts`: earn an achievement, revoke its source event, sync once and assert `revoked`, sync again without a qualifying event and assert it remains `revoked`.
- [x] Patch repository/service logic so `revoked` cannot be downgraded to `in_progress` unless an explicit future product rule reactivates achievements.
- [x] Confirm `earned` still remains stable when the qualifying event exists.
- [x] Confirm company scoping still holds for the same user in another company.
- [x] Refresh `/conquistas` mobile top/bottom evidence or downgrade the mobile screenshot claim in the Wave 8 scorecard.
- [x] Update Wave 8 scorecard from `PASS local validation` to `PASS after revocation correction` only after tests/evidence pass.

## Execution Receipt

RED before patch:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts
```

Result: 1 failed, 2 passed. The repeated sync assertion received
`in_progress` instead of `revoked`.

GREEN after patch:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

Result: 1 file / 3 tests passed, then 2 files / 19 tests passed.

Evidence decision:

- Did not recapture screenshots in this lane.
- Downgraded the Wave 8 scorecard's mobile top/bottom evidence claim so the
  byte-identical historical screenshots are not treated as independent visual
  proof.

## Verification

Run:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
npx tsc --noEmit
git diff --check
```

If screenshot evidence is refreshed, also capture new `/conquistas` mobile top/bottom screenshots and verify hashes differ or explain why a single viewport is sufficient.

## Pass Gate

- Revoked achievements remain revoked across repeated syncs.
- No legacy gamification or sensitive health source is introduced.
- DSAR/erasure behavior remains intact.
- Scorecard reflects the new evidence accurately.
