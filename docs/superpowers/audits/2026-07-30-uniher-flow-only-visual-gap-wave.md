# UniHER flow-only visual gap wave

Date: 2026-07-30

## Decision

PASS.

`/onboarding-rh` and `/primeiro-acesso` are real flow-only authenticated surfaces, not recoverable product shells. This wave closes the visual coverage gap recorded in the authenticated no-spec matrix by adding both routes to the visual smoke matrix and capturing focused production desktop/mobile evidence.

## Scope

- Intent: prove two authenticated helper/first-run routes do not render specs/placeholders and keep them in future visual smoke coverage.
- Source of truth: `docs/superpowers/audits/2026-07-30-uniher-authenticated-no-spec-matrix.md`, `src/app/(platform)/onboarding-rh/page.tsx`, `src/app/(platform)/primeiro-acesso/page.tsx`, `tests/e2e/visual-ux.spec.ts`.
- Allowlist: `tests/e2e/visual-ux.spec.ts`, this receipt, matrix/goal docs, focused production screenshots, visual smoke report outputs.
- Denylist: public landing, public assets, permissions, APIs, database contracts, sensitive modules, Liga/ranking/rewards, NR-1/Yavix/COPSOQ, Concierge, Denuncias, SIPAT and Desenvolvimento Humano.

## Classification

- `/onboarding-rh`: `PASS_REAL_PRODUCT`, RH onboarding checklist backed by `/api/rh/onboarding-status`.
- `/primeiro-acesso`: `PASS_REAL_PRODUCT`, first-access password/tour/welcome flow. Production evidence uses the admin welcome state to avoid mutating/resetting real production users.

No product behavior was changed.

## Changes

- `tests/e2e/visual-ux.spec.ts`: added `admin-primeiro-acesso` and `rh-onboarding` to `VISUAL_SMOKE_ROUTES`.
- Matrix/goal docs updated to mark the previous visual coverage gap as closed.

## Verification

PASS:

```powershell
npx tsc --noEmit
git diff --check -- tests/e2e/visual-ux.spec.ts docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30
cd tests; npx playwright test --config=playwright.config.ts --project=visual-ux -g "route and viewport matrix is reproducible"
```

Visual smoke matrix result after route inclusion:

- 204 checks.
- 204 PASS.
- 0 FAIL.
- Evidence: `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.json`.

Production focused visual evidence:

- `docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30/summary.json`
- `docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30/desktop-1366-rh-onboarding.png`
- `docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30/mobile-390-rh-onboarding.png`
- `docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30/desktop-1366-admin-primeiro-acesso.png`
- `docs/superpowers/evidence/production-flow-only-visual-gap-a568be1-2026-07-30/mobile-390-admin-primeiro-acesso.png`

Focused production result:

- 4 checks.
- 4 PASS.
- 0 REVIEW.
- 0 ERROR.
- No horizontal overflow.
- No forbidden spec/placeholder/internal copy terms.

Landing guard:

```text
landing_worktree_diff_count=0
```

## Drift / Risk

- The `/primeiro-acesso` production screenshot intentionally uses the existing admin welcome state. It proves the route is not a shell but does not mutate production to force password/tour states.
- If first-access password or tour UI changes later, capture dedicated local seeded screenshots for those states before claiming visual PASS.

## Next Wave

Run the next authenticated no-spec sweep only if new routes are added or if source scans find reachable shell/spec copy outside the current 75-route sweep plus the newly covered flow-only routes.
