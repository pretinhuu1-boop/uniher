# UniHER Paola P6 RH/Admin Aggregate Dashboard

Date: 2026-07-24
Coordinator: current Codex session
Status: PASS for first aggregate foundation and Admin selected-company reporting scope

## Intent

Open P6 after P5 by adding a privacy-safe `Check-in x Check-out` aggregate
projection for RH/Admin dashboards.

This lane does not expose individual mood, individual check-in, individual
check-out, Semaforo, exam detail, agenda detail or NR-1 answer data.

## Harness Contract

- Source of truth: Paola redesign contract P6, P5 check-out foundation and
  current-state scorecard.
- Write allowlist:
  - `src/services/dashboard.service.ts`
  - `src/types/platform.ts`
  - `src/app/(platform)/dashboard/**`
  - focused dashboard/report tests
  - orchestration docs/ledger
- Write denylist:
  - no new wellbeing capture or migration
  - no mood values in RH/Admin response
  - no individual event rows in RH/Admin response
  - no Semaforo, Liga/ranking, health scoring, agenda/exam details or NR-1 data
  - no SIPAT/Concierge/Denuncias/Yavix production behavior

## Implementation Receipt

- Added protected dashboard metrics:
  - `wellbeingCheckIn`
  - `wellbeingCheckOut`
- Added `wellbeingSeries` with monthly protected check-in/check-out counts.
- Reused the existing eligible contributor filter used by protected dashboard
  projections.
- Counts distinct contributors only, scoped to authenticated company and
  optional department filter.
- Applies minimum-cohort suppression and complementary suppression between
  check-in and check-out cells.
- Applies temporal stable-cohort suppression across adjacent monthly cells, in
  line with the existing protected exam series behavior.
- Added a dashboard section `Check-in x Check-out` that renders protected
  aggregate counts only.
- Preserved the existing protected summary placeholders for engagement and
  campaign participation while adding check-in/check-out summary cells.
- Extended CSV export with the same protected monthly aggregate.

## Privacy Boundary

- SQL selects `event_type`, period and distinct `user_id` only for counting.
- The API projection does not serialize `user_id`, `participant_id`, `mood` or
  individual event rows.
- Small check-out cohorts suppress the paired check-in aggregate to avoid
  difference-based inference.

## Validation

```powershell
npm run test:unit -- tests/unit/privacy/report-projection.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/dashboard-charts.test.tsx
npx tsc --noEmit
```

Result:

- PASS: 4 files / 34 tests.
- PASS: TypeScript.
- PASS: combined P5/P6 suite, 10 files / 109 tests.
- PASS: `git diff --check` with LF/CRLF warnings only.
- PASS: `npm run build`, 148 pages; known Turbopack/NFT warning remains.
- PASS: RH desktop/mobile screenshots captured under
  `C:\Users\user\Codex\2026-07-24\uniher-p6-aggregates`.
- PASS: Admin Master desktop/mobile proof captured under
  `C:\Users\user\Codex\2026-07-24\uniher-p6-admin-master`; master without
  company scope now receives an explicit company-selection gate instead of a
  generic dashboard error, and direct `/api/dashboard` access fails closed with
  `COMPANY_SCOPE_REQUIRED`.
- PASS: Admin Master `/dashboard` now includes an explicit company selector;
  selected company scope is sent as `companyId` only for companyless Admin
  Master sessions, and scoped RH/company users cannot override their session
  company.
- PASS: runtime evidence captured under `docs/superpowers/evidence/` proves
  `400` without Admin company scope, `200` with selected company,
  `403` for RH override attempts, no visible mood/user ID leak and no
  horizontal overflow.

## Remaining Gates

- Full Dra. Paola visual approval remains HOLD because P7B menu-card treatment
  is separate from this P6 data foundation.
