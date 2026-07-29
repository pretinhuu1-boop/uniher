# UniHER Paola P8 module-management preflight scorecard

**Date:** 2026-07-24
**Decision:** PASS for preflight / HOLD for implementation

## Scope

Audit the existing `company_modules` contract before opening Admin/RH module
activation/deactivation mutations.

## Files Inspected

- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `src/lib/db/migrations/060_company_modules.sql`
- `src/app/api/company/modules/route.ts`
- `src/app/(platform)/produtos-modulos/page.tsx`
- `tests/unit/company-modules.test.ts`
- `tests/unit/company-modules-api.test.ts`
- `src/lib/audit.ts`
- `src/app/api/admin/companies/[id]/route.ts`

## Findings

| Gate | Status | Evidence |
|---|---|---|
| Canonical table exists | PASS | Migration `060_company_modules.sql` defines `company_modules` with company, slug, state, visibility, notes and updated actor fields. |
| Typed module contract exists | PASS | `src/types/modules.ts` defines the approved slugs, states and defaults. |
| Read endpoint is scoped | PASS | `GET /api/company/modules` requires `auth.companyId` and lists only that company. |
| Read endpoint is navigation-safe | PASS | Response contains only `module_slug`, `module_state` and `visible`. |
| No row creation on read | PASS | API overlays defaults in memory and `tests/unit/company-modules-api.test.ts` asserts row count remains zero for companies without records. |
| Mutation helper exists | PASS/HOLD | `upsertCompanyModule()` exists, but no approved mutation API route is wired. |
| Default provisioning helper risk | HOLD | `ensureCompanyModules()` exists and writes all default rows; P8 must keep it out of GET/read paths. |
| Audit infrastructure exists | PASS/HOLD | `logAudit()` exists, but `AuditAction` needs a module-management action before mutation implementation. |
| UI mutation surface | HOLD | `/produtos-modulos` is still a governance shell and intentionally does not mutate contracts or permissions. |
| Sensitive workflow activation | PASS | No P8 mutation route exists, so P8 has not activated NR-1/Yavix, SIPAT, Concierge, Denuncias, Semaforo or Liga. |

## Module State Inventory

Current allowed states:

- `enabled`
- `locked`
- `coming_soon`
- `partner_managed`
- `requires_contract`

Current slugs:

- `primary_health`
- `concierge`
- `education`
- `achievements`
- `nr1`
- `sipat`
- `human_development`
- `denunciation`

Sensitive defaults:

- `primary_health`: `locked`
- `concierge`: `requires_contract`
- `nr1`: `requires_contract`
- `sipat`: `locked`
- `human_development`: `requires_contract`
- `denunciation`: `partner_managed`

Open-by-default non-sensitive modules:

- `education`: `enabled`
- `achievements`: `enabled`

## Required P8 Implementation Contract

- Master Admin write authorization first.
- Company-scoped RH users remain read-only unless separately approved.
- Mutations must validate company existence and typed slug/state values.
- Mutations must be limited to one company/module row per request.
- Mutations must log previous and next values.
- Mutations must not call `ensureCompanyModules()` implicitly.
- Mutations must not create or activate sensitive downstream workflows.
- NR-1 route/API access must continue using the canonical runtime entitlement
  guard, not merely UI copy.

## Validation Commands

```powershell
rg -n "ensureCompanyModules|upsertCompanyModule|company_modules|module_state|company/modules|produtos-modulos" src tests docs -S
Get-Content -Path 'src/app/api/company/modules/route.ts'
Get-Content -Path 'tests/unit/company-modules-api.test.ts'
Get-Content -LiteralPath 'src/app/api/admin/companies/[id]/route.ts' -TotalCount 260
```

Result:

- PASS: inspected contract and current route/test coverage.
- PASS: no P8 mutation endpoint exists in the current codebase.
- HOLD: implementation must wait for explicit approval because it can alter
  module entitlements.

## Decision

P8 preflight is complete. The next safe wave is a focused implementation lane
only if the operator explicitly approves module-management mutations.
