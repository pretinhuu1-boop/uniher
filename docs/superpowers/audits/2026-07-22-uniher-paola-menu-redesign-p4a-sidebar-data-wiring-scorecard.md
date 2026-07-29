# UniHER Paola menu redesign P4A Sidebar data wiring scorecard

**Date:** 2026-07-22
**Lane:** `P4A Sidebar data/API wiring`
**Status:** PASS after finding correction
**Coordinator:** current session

## Objective

Wire the existing Sidebar runtime navigation to the canonical `company_modules` entitlement rows without activating module administration, sensitive workflows, SIPAT content, NR-1/Yavix production behavior, Semaforo, Liga, Concierge cases or Denuncias partner flows.

## Harness contract

- Intent source: Dra. Paola menu redesign contract, P1 module entitlement, P2 navigation contract and P3 locked shells.
- Write allowlist:
  - `src/app/api/company/modules/route.ts`
  - `src/components/platform/Sidebar.tsx`
  - `src/types/modules.ts`
  - `tests/unit/company-modules-api.test.ts`
  - `tests/unit/platform/sidebar-capability.test.tsx`
  - this scorecard and orchestration docs
- Write denylist honored: public landing, metadata, email surfaces, Yavix provisioning, Semaforo production behavior, Liga production behavior, clinical/legal flows, `data/`, `.next/`.
- Stop condition: PASS after tests, typecheck, build and diff hygiene.

## Files changed

- `src/app/api/company/modules/route.ts`
- `src/components/platform/Sidebar.tsx`
- `src/types/modules.ts`
- `tests/unit/company-modules-api.test.ts`
- `tests/unit/platform/sidebar-capability.test.tsx`
- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4a-sidebar-data-wiring-scorecard.md`

## Behavior

- Adds authenticated read-only `GET /api/company/modules`.
- Response is scoped to `auth.companyId`.
- Response exposes only navigation-safe fields: `module_slug`, `module_state`, `visible`.
- Endpoint does not call `ensureCompanyModules`; companies without rows receive in-memory default navigation rows so visible locked modules still appear without creating database rows.
- Sidebar requests `/api/company/modules` with SWR key scoped by endpoint, user id, company id and active navigation role.
- Sidebar uses `getModuleAwareNavigationForRole(role, modules)` when data exists and falls back to current static navigation when no rows/data are available.
- Locked and gated modules render badge metadata from P2.
- NR-1 rows in `requires_contract` remain visible with `Contrato` badge but route to the locked `/nr1` shell; only explicit `enabled` rows can route to `/avaliacao-nr1`.

## Validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/company-modules-api.test.ts tests/unit/company-modules.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/navigation.test.ts` | PASS; 4 files, 45 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/company-modules-api.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/module-shells.test.ts` | PASS; 5 files, 60 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; `/api/company/modules` included as dynamic route. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted twice. |
| P4A trailing whitespace check | PASS. |
| `git diff --check` on tracked P4A files | PASS; LF/CRLF normalization warnings only. |

## Finding correction validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 6 files, 59 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/company-modules-api.test.ts tests/unit/platform/navigation.test.ts` | PASS; 4 files, 60 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |

## NR-1 default gate correction validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/module-shells.test.ts` | PASS; 2 files, 37 tests. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts` | PASS; 5 files, 73 tests. |

Correction receipt:

- RED before patch: default/gated NR-1 navigation still pointed to `/avaliacao-nr1`, and no `/nr1` shell existed.
- GREEN after patch: `requires_contract` NR-1 points to `/nr1` with `Contrato`; explicit `enabled` NR-1 can still point to `/avaliacao-nr1`.
- The `/nr1` page is a static `ContainedSurfacePreview` shell and does not import COPSOQ runtime, `useCopsoq` or Yavix request paths.
- Review follow-up: `/colaboradora` no longer uses public entitlement env defaults to expose `/avaliacao-nr1`; it fetches `/api/company/modules` and requires visible `enabled` NR-1 through `isNr1RuntimeEntitled`.
- Runtime/API follow-up: `/avaliacao-nr1` and every `/api/yavix/copsoq/*` endpoint now enforce the canonical server-side NR-1 entitlement guard before mounting COPSOQ or returning mock/runtime behavior.

## Privacy and governance checks

- No individual health, Semaforo, NR-1 answer, agenda, exam or check-in/check-out data is exposed.
- No module state mutation endpoint was added.
- No default module rows are created by a read.
- SIPAT remains source-gated; this lane does not add lessons, campaigns, materials, schedules or videos.
- Yavix/NR-1 remains preview/contract-gated; `requires_contract` module rows route to `/nr1`, `/colaboradora`, `/avaliacao-nr1` and `/api/yavix/copsoq/*` require visible `enabled` NR-1 before runtime access, and this lane does not add provisioning, scoring, result sync or partner calls.

## Decision

PASS after finding correction. The Sidebar now consumes the canonical global module contract with default visible navigation rows overlaid by company-scoped rows. Reads remain non-mutating; module-management mutations remain a separate future lane.
