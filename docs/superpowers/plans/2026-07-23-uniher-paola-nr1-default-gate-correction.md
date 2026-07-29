# UniHER Paola NR-1 default gate correction plan

**Date:** 2026-07-23
**Status:** executed
**Lane:** Paola P4A/P4 correction
**Current decision:** HOLD
**Finding source:** separate Paola P1-P4 audit session

## Finding

P1: module-aware navigation exposes NR-1/COPSOQ runtime by default.

Observed mechanism:

- `src/types/modules.ts` sets `nr1` as `defaultState: 'requires_contract'` and `visibleByDefault: true`.
- `GET /api/company/modules` returns default visible navigation rows for companies without DB rows.
- `src/components/platform/navigation.ts` maps `nr1` to `/avaliacao-nr1`.
- `/avaliacao-nr1` renders `CopsoqFlow`.
- `useCopsoq.ts` bootstraps and calls `/api/yavix/copsoq/*` for bootstrap, answer, consent and submit.

This violates Paola P4A/P4's claim that module-aware menus do not activate sensitive behavior by default.

## Harness

**Write allowlist:**

- `src/components/platform/navigation.ts`
- `src/types/modules.ts`
- `src/app/(platform)/avaliacao-nr1/page.tsx` only if route-level gate is chosen
- `src/app/(platform)/nr1/page.tsx` or existing contained shell if a shell route exists/is created
- `tests/unit/platform/navigation.test.ts`
- `tests/unit/company-modules-api.test.ts`
- `tests/unit/module-shells.test.ts`
- Paola P4A/P4/current-state scorecards
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

**Write denylist:**

- no Yavix provisioning endpoints or payload assumptions
- no COPSOQ production enablement
- no changes to `/api/yavix/copsoq/*` unless the route-level gate requires a read-only test
- no hidden activation via default rows

## Preferred Fix

Use a safe shell destination for `requires_contract` NR-1 menu entries.

Concrete rule:

- If module state is `enabled`, and a future explicit entitlement/preview gate exists, route may go to `/avaliacao-nr1`.
- If module state is `requires_contract`, route must go to a locked/contained NR-1 shell, not `CopsoqFlow`.
- Default company rows may remain visible, but their destination must be locked.

If no separate shell exists, create a small locked page that uses `ContainedSurfacePreview` and says NR-1/COPSOQ production behavior requires contract validation.

## Tasks

- [x] Add RED navigation/API tests proving a default `nr1` row does not link to `/avaliacao-nr1`.
- [x] Add RED test proving `requires_contract` renders/points to a locked shell with a `Contrato`/locked badge.
- [x] Patch navigation/module destination logic.
- [x] Keep `/avaliacao-nr1` available only for explicit enabled/preview state if that route is still needed.
- [x] Update Paola P4A/P4 scorecards to state that `requires_contract` is visible but runtime-gated.

## Execution Receipt

RED before patch:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/module-shells.test.ts
```

Result: 2 files failed, 4 tests failed. Failures proved `/nr1` did not exist
and gated NR-1 still pointed to `/avaliacao-nr1`.

GREEN after patch:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/module-shells.test.ts
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts
```

Result: 2 files / 37 tests passed, then 5 files / 73 tests passed.

Behavior decision:

- Added locked shell route `/nr1`.
- `requires_contract` NR-1 points to `/nr1`.
- Explicit `enabled` NR-1 can still point to `/avaliacao-nr1`.
- The `/nr1` shell does not import COPSOQ runtime, `useCopsoq` or Yavix request paths.

## Review Follow-Up

The post-fix review found a remaining `/colaboradora` bypass: the journey row
could expose `/avaliacao-nr1` from public entitlement env defaults. This is now
closed:

- `/colaboradora` fetches `/api/company/modules`.
- `isNr1RuntimeEntitled` requires the NR-1 module row to be `visible: 1` and
  `module_state: 'enabled'`.
- `NEXT_PUBLIC_UNIHER_NR1_ENTITLEMENT` is no longer used.
- `/nr1` shell copy was accented for consistency with the P7A polish pass.

The next review found a second, lower-level bypass: direct `/avaliacao-nr1`
and `/api/yavix/copsoq/*` access still depended only on role auth. This is now
tracked and corrected in
`docs/superpowers/plans/2026-07-23-uniher-paola-nr1-runtime-entitlement-guard.md`.

## Verification

Run:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts
npx tsc --noEmit
git diff --check
```

Optional browser proof:

- RH/Admin menu shows NR-1 visible/locked.
- Clicking locked NR-1 does not mount COPSOQ form or call `/api/yavix/copsoq/*`.

## Pass Gate

- Default module rows do not activate COPSOQ runtime.
- `requires_contract` state is honest and visible.
- No Yavix/Semaforo/Liga behavior is activated.
