# UniHER Paola P6 RH/Admin Aggregate Dashboard Scorecard

Date: 2026-07-24
Lane: P6 - RH/Admin aggregate dashboard
Decision: PASS for protected aggregate foundation and Admin selected-company scope; HOLD for full visual/product approval

## Scope

Implemented the first P6 slice: a protected aggregate `Check-in x Check-out`
projection and dashboard rendering. This is not a release/deploy claim.

## Evidence

Commands:

```powershell
npm run test:unit -- tests/unit/privacy/report-projection.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/dashboard-charts.test.tsx
npx tsc --noEmit
```

Results:

- PASS: 4 focused files / 34 tests.
- PASS: TypeScript.
- PASS: broader combined P5/P6 suite, 10 files / 109 tests.
- PASS: `git diff --check` with LF/CRLF warnings only.
- PASS: `npm run build`, 148 pages; known Turbopack/NFT warning remains.

Runtime evidence:

- `C:\Users\user\Codex\2026-07-24\uniher-p6-aggregates\rh-dashboard-p6-desktop.png`
- `C:\Users\user\Codex\2026-07-24\uniher-p6-aggregates\rh-dashboard-p6-mobile.png`
- `C:\Users\user\Codex\2026-07-24\uniher-p6-aggregates\metrics.json`
- `C:\Users\user\Codex\2026-07-24\uniher-p6-admin-master\admin-master-company-scope-desktop.png`
- `C:\Users\user\Codex\2026-07-24\uniher-p6-admin-master\admin-master-company-scope-mobile.png`
- `C:\Users\user\Codex\2026-07-24\uniher-p6-admin-master\admin-master-company-scope-metrics.json`
- `docs/superpowers/evidence/p6-admin-company-scope-gate-desktop.png`
- `docs/superpowers/evidence/p6-admin-selected-company-desktop.png`
- `docs/superpowers/evidence/p6-admin-selected-company-mobile.png`
- `docs/superpowers/evidence/p6-admin-selected-company-metrics.json`

## Verification

- PASS: `wellbeing_events` is read by company, optional department and period.
- PASS: only distinct aggregate counts are serialized.
- PASS: `mood`, `user_id` and `participant_id` are not present in the dashboard
  projection.
- PASS: 9 contributors are suppressed and 10 contributors are visible.
- PASS: if check-out has a small cohort, paired check-in is suppressed by
  complementary suppression.
- PASS: adjacent visible monthly check-in/check-out cells are suppressed when
  their stable participant intersection is below the protected cohort.
- PASS: the dashboard component renders aggregate text and no canvas or
  individual data.
- PASS: the dashboard summary preserves existing protected engagement and
  campaign placeholders while adding check-in/check-out cells.
- PASS: CSV export uses the same protected union values.
- PASS: RH dashboard desktop/mobile capture reached `/dashboard`, found
  `Check-in x Check-out`, had horizontal overflow `0`, no console/page errors
  and no visible `mood`/`humor`/individual ID leak.
- PASS: Admin Master desktop/mobile capture reaches `/dashboard` and fails
  closed with explicit company-scope copy instead of a generic dashboard error;
  no dashboard aggregate is rendered without selected company scope, no mood or
  individual ID leak, and horizontal overflow is `0`.
- PASS: direct Admin Master `/api/dashboard` access without selected company
  scope fails closed with `COMPANY_SCOPE_REQUIRED`.
- PASS: Admin Master can now select an explicit company on `/dashboard`; the UI
  loads the protected aggregate dashboard only after selection and resets
  department scope when the company changes.
- PASS: direct Admin Master `/api/dashboard?period=1m&companyId=company_uniher`
  returns `200`, while RH/company-scoped users attempting
  `/api/dashboard?companyId=company_other` receive `403` with
  `COMPANY_SCOPE_FORBIDDEN`.
- PASS: selected-company desktop/mobile captures show `Check-in x Check-out`,
  compact protected summary values, horizontal overflow `0`, and no visible
  `mood`, `humor`, `user_id` or `participant_id` leak.

## Files Changed

- `src/services/dashboard.service.ts`
- `src/types/platform.ts`
- `src/app/(platform)/dashboard/dashboard-view-model.ts`
- `src/app/(platform)/dashboard/page.tsx`
- `src/app/api/dashboard/route.ts`
- `src/hooks/useDashboard.ts`
- `src/app/(platform)/dashboard/dashboard-export.ts`
- `src/app/(platform)/dashboard/dashboard.module.css`
- `src/app/(platform)/dashboard/components/DashboardDetails.tsx`
- `src/app/(platform)/dashboard/components/WellbeingOverview.tsx`
- `tests/unit/privacy/report-projection.test.ts`
- `tests/unit/platform/dashboard-view-model.test.ts`
- `tests/unit/platform/dashboard-export.test.ts`
- `tests/unit/platform/dashboard-charts.test.tsx`
- `tests/unit/platform/use-dashboard.test.ts`
- `tests/e2e/rh.spec.ts`
- `tests/e2e/integrado.spec.ts`
- this scorecard and the P6 plan

## Decision

P6 aggregate foundation is technically PASS for RH/company-scoped dashboard
behavior and Admin Master selected-company reporting scope. Full
visual/product approval remains separate.
