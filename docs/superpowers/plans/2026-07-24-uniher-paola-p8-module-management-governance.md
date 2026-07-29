# UniHER Paola P8 module-management governance

**Date:** 2026-07-24
**Status:** PREFLIGHT PASS / IMPLEMENTATION HOLD
**Lane:** P8 module-management governance

## Objective

Prepare the Admin module-management mutation lane without enabling sensitive
module behavior by accident.

The target capability is explicit company-scoped control of `company_modules`
rows for contracted modules. This plan does not approve production workflows,
partner integrations, Yavix provisioning, Semaforo behavior, Liga/ranking or
SIPAT content.

## Source Of Truth

- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `src/lib/db/migrations/060_company_modules.sql`
- `src/app/api/company/modules/route.ts`

## Current Runtime Contract

- `company_modules` is the canonical per-company module state table.
- `GET /api/company/modules` is authenticated, company-scoped and read-only.
- Reads return navigation-safe fields only: `module_slug`, `module_state`,
  `visible`.
- Reads overlay explicit DB rows on top of in-memory definitions and must not
  create default rows.
- `ensureCompanyModules()` exists for explicit provisioning, but must not be
  called by read endpoints or by implicit navigation flows.
- `upsertCompanyModule()` exists, but no approved API mutation route is wired
  yet.

## Write Allowlist For Future Implementation

- `src/app/api/admin/company-modules/**` or another explicitly named Admin-only
  module mutation route.
- `src/app/(platform)/produtos-modulos/**` for the management UI.
- `src/lib/modules/company-modules.ts` only for validation/transition helpers.
- `src/lib/audit.ts` only to add a typed audit action.
- Focused tests under `tests/unit/company-modules*.test.ts` and any matching
  Admin UI tests.
- P8 docs, scorecards and evidence under `docs/superpowers/`.

## Denylist

- No Yavix/COPSOQ provisioning or external service activation.
- No Semaforo production behavior or health-score generation.
- No Liga, ranking, rewards or gamification activation.
- No SIPAT campaign/content creation.
- No Concierge case workflow.
- No Canal de Denuncias intake/tracking workflow.
- No Desenvolvimento Humano content/workflow.
- No company/user permission mutation outside the selected `company_modules`
  row.
- No default module row creation on GET/read.
- No use of `ensureCompanyModules()` from read endpoints.

## Governance Rules

- Initial writes are Master Admin only.
- RH/company-scoped users remain read-only until a separate approval expands
  the write policy.
- Every write must validate an existing company, a known module slug, a known
  module state, boolean visibility and optional notes length.
- Every write must be tenant-isolated by `company_id`.
- Every write must create an audit log entry containing actor, company, module
  slug, previous state, next state, previous visibility and next visibility.
- State changes are metadata/navigation entitlement only.
- `enabled` may expose an already guarded route only where runtime entitlement
  already honors `company_modules`; it must not start external or sensitive
  workflows by itself.
- NR-1 remains fail-closed unless the canonical NR-1 runtime entitlement guard
  also allows access.
- Partner/content modules remain source-gated even when their module row is
  edited.

## Future Implementation Shape

1. Add a Master Admin mutation endpoint for one company/module row.
2. Validate payload with Zod against the typed module contract.
3. Read the previous row before mutation.
4. Upsert only the requested row through the write queue.
5. Write an audit log event.
6. Return the updated navigation-safe row plus metadata needed by the UI.
7. Build `/produtos-modulos` as an operational table with status controls,
   visibility toggle, notes and explicit gated copy.

## Acceptance Gates

- Unit test: read endpoints do not create default rows.
- Unit test: non-Master/Admin company-scoped callers cannot mutate rows.
- Unit test: Master Admin cannot mutate an unknown company, slug or state.
- Unit test: company A mutation does not affect company B.
- Unit test: audit log is required for every mutation.
- Runtime evidence: management screen lists current states without exposing
  sensitive workflows.
- Runtime evidence: a controlled mutation changes navigation entitlement only.

## Stop Condition

Stop before implementation unless the operator explicitly approves P8 mutation
work. The current safe output is this governance contract plus scorecard.
