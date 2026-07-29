# UniHER Paola menu redesign P1 implementation scorecard

**Date:** 2026-07-22
**Lane:** `P1 Module entitlement implementation`
**Decision:** PASS

## Harness contract

Intent source: Dra. Paola menu redesign contract, P1 preflight scorecard, P1A content inventory and current orchestration plan.

Coordinator: current session.

Worker lane: `P1 Module entitlement implementation`.

Write allowlist used:

- `src/lib/db/migrations/060_company_modules.sql`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `tests/unit/company-modules.test.ts`
- `tests/unit/company-modules-migration.test.ts`
- Paola docs/ledger updates required to register the receipt

Write denylist respected:

- navigation/sidebar files
- route pages
- dashboard charts
- check-out data model
- Concierge/Denuncias/SIPAT/Human Development workflows
- Yavix, Semaforo, Liga or ranking behavior
- public landing, metadata and email surfaces
- pre-existing dirty product files not in the allowlist

## Implementation summary

P1 added a company-scoped module entitlement foundation without wiring it to UI or runtime behavior.

Files added:

- `src/lib/db/migrations/060_company_modules.sql`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `tests/unit/company-modules.test.ts`
- `tests/unit/company-modules-migration.test.ts`

The migration creates `company_modules` with:

- approved module slugs only;
- approved states only: `enabled`, `locked`, `coming_soon`, `partner_managed`, `requires_contract`;
- `visible` as an explicit 0/1 flag;
- company cascade deletion;
- updater reference set to null when the updater user is removed;
- uniqueness by `company_id, module_slug`.

The helper creates a typed contract for:

- canonical module definitions and labels;
- default states that keep sensitive modules locked, contract-gated or partner-managed;
- typed role visibility separated from access state;
- list/get/upsert/ensure operations.

## Safety result

- Absence of a `company_modules` row grants no module access.
- Sensitive modules are not enabled by default: `primary_health`, `concierge`, `nr1`, `sipat`, `human_development`, `denunciation`.
- The only enabled defaults are existing safe module groups: `education` and `achievements`.
- No navigation or route file was changed, so no user-facing menu behavior changed in this lane.
- No Semaforo, Liga, Yavix, Concierge case, Denuncias partner or SIPAT content behavior was activated.

## Commands run

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/company-modules.test.ts tests/unit/company-modules-migration.test.ts` | PASS: 2 files, 7 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts` | PASS: 2 files, 33 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS. Next.js build completed; existing Turbopack warning remains for `next.config.ts` traced through `/api/admin/system/ops`. |

## Loop result

Preflight: confirmed dirty worktree and exact P1 allowlist.

Observe: read migration runner, recent migrations, representative unit/migration tests and DB helper patterns.

Plan: implement the minimum company module storage/helper contract with no navigation, route or sensitive behavior wiring.

Act: added migration, types, helper and focused tests.

Verify: targeted tests, containment tests, typecheck and build passed.

Reflect: P1 is now a safe foundation for P2 navigation. P3 content shells remain gated by P2 and by the SIPAT source/content policy.

Coordinator gate: PASS. P2 navigation contract can start under its own allowlist; P3 remains HOLD.
