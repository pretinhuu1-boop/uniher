# UniHER Paola menu redesign P2 navigation scorecard

**Date:** 2026-07-22
**Lane:** `P2 Navigation contract`
**Decision:** PASS

## Harness contract

Intent source: Dra. Paola menu redesign contract, P1 module entitlement implementation and P1A content inventory.

Coordinator: current session.

Worker lane: `P2 Navigation contract`.

Write allowlist used:

- `src/components/platform/navigation.ts`
- `src/components/platform/Sidebar.tsx`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `tests/unit/platform/navigation.test.ts`
- `tests/unit/platform/sidebar-navigation.test.tsx`
- Paola docs/ledger updates required to register the receipt

Write denylist respected:

- route pages and route shell pages
- module API endpoints
- dashboard charts
- check-out data model
- Concierge/Denuncias/SIPAT/Human Development workflows
- Yavix, Semaforo, Liga or ranking behavior
- public landing, metadata and email surfaces
- pre-existing dirty product files not in the allowlist

## Implementation summary

P2 adds a module-aware navigation contract without changing the currently rendered navigation table.

Changes:

- moved canonical `COMPANY_MODULE_DEFINITIONS` into `src/types/modules.ts` so client-safe navigation can reuse the module contract without importing DB helpers;
- kept `getNavigationForRole(role)` backwards compatible and unchanged by default;
- added `getModuleAwareNavigationForRole(role, companyModules)` for future role + module-state menu generation;
- added optional navigation item metadata: `moduleSlug`, `moduleState`, `badgeLabel`;
- added Sidebar badge rendering support for navigation items that already carry `badgeLabel`;
- added tests for absence of rows, role visibility, hidden modules, duplicate route prevention and state badges.

## Safety result

- Current Sidebar still calls `getNavigationForRole(role)`, so no user-facing menu changes are active yet.
- Absence of module rows does not add module navigation.
- Role visibility remains separate from module access state.
- Hidden module rows are omitted.
- Existing routes are not duplicated when module-aware navigation is generated.
- Sensitive module links are metadata-ready only; route shells are still P3.
- SIPAT still must not carry invented content.

## Commands run

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/company-modules.test.ts tests/unit/company-modules-migration.test.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx` | PASS: 4 files, 33 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/platform/sidebar-capability.test.tsx` | PASS: 3 files, 47 tests. |
| `npx tsc --noEmit` | PASS after adding the missing type import in `company-modules.ts`. |
| `npm run build` | PASS. Next.js build completed; existing Turbopack/NFT trace warning remains around `next.config.ts` through `/api/admin/system/ops`, now emitted twice. |
| `git diff --check` on the P2 write set | PASS; only LF/CRLF normalization warnings. |

## Loop result

Preflight: confirmed dirty worktree and exact P2 allowlist.

Observe: read current navigation, sidebar rendering and existing platform navigation tests.

Plan: keep existing runtime navigation stable while adding the module-aware resolver and badge metadata.

Act: updated navigation contract, Sidebar badge fallback and focused tests.

Verify: focused tests, containment tests, typecheck, build and diff check passed.

Reflect: P2 is ready for P3 shells. The data/API wiring that makes Sidebar consume real company module rows is intentionally not part of this lane.

Coordinator gate: PASS. P3 can start under a new exact allowlist for locked/source-needed route shells.
