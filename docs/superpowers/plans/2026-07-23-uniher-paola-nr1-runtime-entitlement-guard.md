# UniHER Paola NR-1 Runtime Entitlement Guard

Date: 2026-07-23
Coordinator: current Codex session
Status: PASS for runtime entitlement guard; HOLD for Yavix production approval

## Finding

Navigation and collaborator-home gates were closed, but a direct visit to
`/avaliacao-nr1` still mounted `CopsoqFlow`, and `/api/yavix/copsoq/*`
accepted authenticated collaborator/leadership calls without checking whether
the company had NR-1 explicitly enabled.

## Harness Contract

- Intent source: Dra. Paola redesign governance and post-audit finding.
- Write allowlist:
  - `src/lib/nr1/*`
  - `src/app/(platform)/avaliacao-nr1/page.tsx`
  - `src/app/api/yavix/copsoq/*/route.ts`
  - focused unit tests
  - Paola ledger/scorecards
- Write denylist:
  - no Yavix production provisioning
  - no scoring/result sync
  - no Semaforo/Liga/gamification coupling
  - no broad auth rewrite
- Runtime rule: COPSOQ runtime is fail-closed unless `company_modules` has an
  explicit `nr1` row with `visible = 1` and `module_state = 'enabled'`.
- Stop conditions:
  - PASS: page route and every COPSOQ endpoint enforce the same helper and tests pass.
  - FAIL: direct route/API can still run from `requires_contract` or missing row.
  - HOLD: final visual or Yavix production approval remains outside this lane.

## Plan

- [x] Add canonical server-side NR-1 runtime entitlement helper.
- [x] Redirect `/avaliacao-nr1` to `/nr1` unless the current request is entitled.
- [x] Return 403 from every `/api/yavix/copsoq/*` endpoint when NR-1 is not enabled for the company.
- [x] Add regression tests for explicit enabled row, `requires_contract`, hidden enabled and missing row.
- [x] Update NR-1 gamification containment test so the new read guard is allowed while legacy writes remain blocked.
- [x] Update docs/ledger to stop relying on navigation-only evidence.

## Receipt

- Added `src/lib/nr1/runtime-entitlement.ts`.
- `/avaliacao-nr1` now checks the current cookie token, resolves company module
  entitlement, and redirects non-entitled users to `/nr1`.
- `/api/yavix/copsoq/bootstrap`, `/answer`, `/consent` and `/submit` now call
  `requireNr1RuntimeEntitlement(auth)` before mock/runtime behavior.
- `tests/unit/nr1-runtime-entitlement.test.ts` proves:
  - only explicit visible enabled NR-1 is entitled;
  - `requires_contract` returns 403;
  - bootstrap is blocked unless company NR-1 is enabled;
  - page and all endpoints contain the canonical guard.

## Validation

Initial focused gate:

```powershell
npm run test:unit -- tests/unit/nr1-runtime-entitlement.test.ts tests/unit/nr1-gamification.test.ts tests/unit/module-shells.test.ts tests/unit/nr1-preview-state.test.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/company-modules-api.test.ts
```

Result: PASS; 7 files / 76 tests.

Final gates:

```powershell
npx tsc --noEmit
git diff --check
npm run build
```

Result:

- `npx tsc --noEmit`: PASS.
- `git diff --check`: PASS; LF/CRLF warnings only.
- `npm run build`: PASS; 146 pages. `/avaliacao-nr1` is now dynamic as expected because it checks cookie/company entitlement server-side. Existing Turbopack/NFT warning remains around `next.config.ts` via `/api/admin/system/ops`.

## Remaining Boundaries

- This does not approve Yavix production integration.
- This does not make NR-1 compliant content, scoring or reporting production-ready.
- Visual approval for Dra. Paola's full redesign remains governed by screenshot evidence and scorecards.
