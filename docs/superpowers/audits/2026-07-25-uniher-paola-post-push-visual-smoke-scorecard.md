# UniHER Paola post-push visual smoke scorecard

**Date:** 2026-07-25
**Branch:** `codex/uniher-wave3-collaborator-nr1`
**Head:** post-push branch, updated through RH seed follow-up
**Decision:** PASS for technical visual/runtime smoke; HOLD for final product approval and P8 implementation

## Scope

Post-push smoke of the Paola redesign branch after the P6 Admin selected-company
dashboard scope, P8 governance preflight and mobile scroll visual hotfix.

The smoke covered:

- Admin Master: `/admin`, `/dashboard`, `/produtos-modulos`, `/configuracoes`
- RH: `/dashboard`, `/colaboradoras-gestao`, `/produtos-modulos`, `/configuracoes`
- Colaboradora: `/colaboradora`, `/configuracoes`, `/nr1`
- Desktop `1440x1100`
- Mobile `390x844`

## Evidence Locations

Local, not committed screenshots/reports:

- `C:\Users\user\Codex\2026-07-25\uniher-broad-visual-smoke\broad-smoke-report.json`
- `C:\Users\user\Codex\2026-07-25\uniher-prod-env-broad-visual-smoke\prod-env-broad-smoke-report.json`
- `C:\Users\user\Codex\2026-07-25\uniher-prod-collaborator-mobile-isolated\collaborator-mobile-report.json`
- `C:\Users\user\Codex\2026-07-25\uniher-post-push-smoke-final\smoke-report.json`
- `C:\Users\user\Codex\2026-07-25\uniher-rh-seed-dashboard-smoke\rh-seed-dashboard-smoke-report.json`
- `C:\Users\user\Codex\2026-07-25\uniher-rh-seed-dashboard-smoke\rh-dashboard-seed-desktop-1440x1100.png`
- `C:\Users\user\Codex\2026-07-25\uniher-rh-seed-dashboard-smoke\rh-dashboard-seed-mobile-390x844.png`

## Findings

| Gate | Status | Evidence |
|---|---|---|
| Worktree state | PASS | `git status --short --branch` clean after commit/push. |
| Dashboard mobile scroll | PASS | Initial smoke found clipped mobile dashboard. Fixed in `8de3042`; final smoke showed real scroll, no hidden content and no horizontal overflow. |
| Dashboard mobile legend | PASS | Initial smoke found cramped age-band legend. Fixed in `8de3042`; final mobile screenshot shows stacked labels/messages. |
| Dev runtime smoke | PASS | `localhost:3001` returned `/api/health` 200; broad visual smoke had zero console errors and zero horizontal overflow across covered routes. |
| Production local smoke without env | EXPECTED FAIL / OPS GATE | `next start` without `JWT_SECRET` made login return 500. Log: `Missing environment variable: JWT_SECRET`. This is a required deploy/env precondition, not a visual regression. |
| Production local smoke with env | PASS | `localhost:3003` with temporary local `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOW_INSECURE_HTTP_COOKIES=true` returned login 200 for Admin/RH/colaboradora and covered routes without console errors, failed requests, bad API responses or horizontal overflow. |
| Colaboradora mobile rate limit | PASS after isolation | Broad matrix hit `429` for the last repeated login attempt. Isolated fresh production server on `localhost:3004` logged in colaboradora mobile with status 200 and validated `/colaboradora`, `/configuracoes`, `/nr1`. |
| Sensitive mood leak | PASS | Smoke checks found no visible mood terms in dashboard/covered route text samples. |
| P8 module mutations | HOLD | P8 remains governance/preflight only; no module mutation endpoint/UI was implemented. |
| RH seed dashboard | PASS | `npm run db:seed` now creates/repairs `rh.visual@eduardaeyurimarketingltda.com.br` as a completed-onboarding RH fixture. Authenticated API smoke returned `/api/rh/onboarding-status` 200 with `isNewRH:false`, `completedCount:4`; desktop/mobile Playwright smoke stayed on `/dashboard`, had no horizontal overflow, no console errors and no HTTP 4xx/5xx API responses. Report retains client-aborted superseded requests as observations. |

## Validation Commands

```powershell
git status --short --branch
Invoke-WebRequest http://localhost:3001/api/health -UseBasicParsing -TimeoutSec 10
npm run db:seed
node <inline RH seed dashboard smoke>
npm run test:unit -- tests/unit/platform/use-dashboard.test.ts tests/unit/privacy/report-projection.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/dashboard-charts.test.tsx
npx tsc --noEmit
npm run build
```

Result:

- PASS: focused unit suite, 5 files / 41 tests.
- PASS: TypeScript.
- PASS: production build, 148 app routes.
- PASS: RH seed fixture repair and RH desktop/mobile dashboard smoke on `localhost:3001`.
- Known warning: Turbopack/NFT trace through `next.config.ts` and
  `src/app/api/admin/system/ops/route.ts`.

## Decision

This branch is technically ready for PR review with the following release
honesty:

- Visual/runtime smoke passed after the mobile scroll fix.
- RH demo/release smoke can now use the completed-onboarding seeded fixture.
- Production deploy must provide `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- P8 is not implemented; it is governance only.
- Final product approval for Paola visual direction remains a human/product
  gate, not a technical gate.
