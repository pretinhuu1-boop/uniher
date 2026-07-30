# UniHER local clickable fixture shell/session lane

Date: 2026-07-30

## Decision

PASS with REVIEW items for the first local fixture lane.

This validates global shell/home controls, logout/session controls and disabled controls in the local Playwright fixture. It does not validate mutation/submission, destructive, stateful edit or collaborator wellbeing workflow buttons yet.

## Scope

- Source map: `docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/blocked-controls.json`.
- Test: `tests/e2e/clickable-fixture.spec.ts`.
- Project: `clickable-fixture` in `tests/playwright.config.ts`.
- Evidence: `docs/superpowers/evidence/local-clickable-fixture-shell-session-5d68e2b-2026-07-30/summary.json`.
- Runtime: local Playwright-owned DB/server only.
- Production: not used for this lane.

## Result

Command:

`cd tests; npx playwright test --config=playwright.config.ts --project=clickable-fixture`

Result: 3 passed.

Evidence summary:

- Total controls in lane: 177.
- PASS: 172.
- REVIEW: 5.
- FAIL: 0.
- Home/logo controls: 76 PASS / 0 REVIEW / 0 FAIL.
- Session/logout controls: 76 PASS / 0 REVIEW / 0 FAIL.
- Disabled controls: 20 PASS / 5 REVIEW / 0 FAIL.

## Review Items

The 5 REVIEW items are all `Participar Agora` controls that existed in the production inventory as disabled controls but were not present in the current local fixture route state:

- colaboradora `/campanhas`.
- lideranca `/campanhas`.
- lideranca `/desafios/gerenciar`.
- lideranca `/liga`.
- lideranca `/liga/gerenciar`.

This is not promoted to product PASS. It means the local seed/fixture does not currently reproduce those disabled production controls, so they need either a fixture adjustment or a separate focused local/production-read-only assertion.

## Guardrails

- Public landing remains untouched.
- Production remained read-only; this lane ran locally.
- Logout/session validation confirmed the local fixture session is ended and a subsequent protected route redirects to auth.
- Sensitive workflow buttons remain HOLD.

## Remaining Blocked Classes

Still not validated by this lane:

- `unknown_button` controls outside the global logo/home case.
- `mutation_or_submit`.
- `destructive`.
- `stateful_open_or_mutation_risk`.
- collaborator wellbeing and check-in/check-out controls.
- RH/Admin create/edit/invite/import/reset/suspend flows.
