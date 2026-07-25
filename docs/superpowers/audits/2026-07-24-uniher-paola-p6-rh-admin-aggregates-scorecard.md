# UniHER Paola P6 RH/Admin Aggregate Dashboard Scorecard

Date: 2026-07-24
Lane: P6 - RH/Admin aggregate dashboard
Decision: PASS for first protected aggregate foundation; HOLD for visual approval

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

## Files Changed

- `src/services/dashboard.service.ts`
- `src/types/platform.ts`
- `src/app/(platform)/dashboard/dashboard-view-model.ts`
- `src/app/(platform)/dashboard/page.tsx`
- `src/app/api/dashboard/route.ts`
- `src/app/(platform)/dashboard/dashboard-export.ts`
- `src/app/(platform)/dashboard/dashboard.module.css`
- `src/app/(platform)/dashboard/components/DashboardDetails.tsx`
- `src/app/(platform)/dashboard/components/WellbeingOverview.tsx`
- `tests/unit/privacy/report-projection.test.ts`
- `tests/unit/platform/dashboard-view-model.test.ts`
- `tests/unit/platform/dashboard-export.test.ts`
- `tests/unit/platform/dashboard-charts.test.tsx`
- `tests/e2e/rh.spec.ts`
- `tests/e2e/integrado.spec.ts`
- this scorecard and the P6 plan

## Decision

P6 first aggregate foundation is technically PASS for RH/company-scoped
dashboard behavior. Admin Master is PASS for fail-closed company-scope handling
and remains HOLD for aggregate visualization until an explicit selected-company
reporting scope exists. Full visual/product approval remains separate.
