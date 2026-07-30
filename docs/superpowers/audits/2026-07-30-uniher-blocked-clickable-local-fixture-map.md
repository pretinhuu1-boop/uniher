# UniHER blocked clickable local fixture map

Date: 2026-07-30

## Decision

HOLD for the blocked clickable classes.

The production read-only lane is complete, but the remaining controls are not safe to validate directly in production. This artifact converts the blocked production inventory into local/fixture batches for the next wave.

## Evidence

- Source inventory: `docs/superpowers/evidence/production-clickable-inventory-a856440-2026-07-30T12-38-56-687Z/all-clickables.json`.
- Map output: `docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/summary.json`.
- Full control matrix: `docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/blocked-controls.json`.
- Markdown digest: `docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/blocked-controls.md`.

## Result

- Raw blocked production occurrences: 656.
- Unique blocked controls by role/route/class/label: 484.
- `unknown_button`: 276.
- `mutation_or_submit`: 79.
- `session`: 76.
- `disabled`: 25.
- `destructive`: 15.
- `stateful_open_or_mutation_risk`: 13.

The largest repeated groups are global logo/sidebar/session controls, collaborator check-in/check-out and wellbeing buttons, RH/Admin invite/export/edit flows, and module-shell/sensitive-route controls.

## Required Test Lanes

- `unknown_button`: local reclassification first. Determine whether each control is read-only UI, navigation/session, mutation, disabled or dead.
- `session`: local/session fixture. Verify logout/menu behavior without disturbing production sessions.
- `mutation_or_submit`: isolated local DB only. Assert expected API/UI state, tenant scope and privacy canaries.
- `destructive`: isolated local DB only. Assert confirmation, permission boundaries and rollback/fixture cleanup.
- `stateful_open_or_mutation_risk`: local fixture first. Open form/modal and verify no write occurs until explicit submit.
- `disabled`: static assertion only. Confirm disabled state and absence of accidental click execution.

## Guardrails

- Production remains read-only until local/fixture lanes pass.
- Public landing remains out of scope.
- Sensitive modules remain fail-closed: NR-1/Yavix/COPSOQ, Concierge, SIPAT, Desenvolvimento Humano, Canal de Denuncias and Liga/ranking/rewards.
- This map does not claim the 656 blocked production occurrences work.

## Next Wave

Start with the highest-confidence local fixture batch:

1. Global shell/session controls: logo/home button and logout/menu buttons across profiles.
2. Disabled controls and read-only-looking filters: assert state or reclassify.
3. RH/Admin stateful/mutation controls: invite/edit/export/new content/new lesson/new company/new user.
4. Collaborator wellbeing controls: check-in/check-out, mood buttons, true/false and register-reading controls.

Only after those local lanes produce PASS evidence should any guarded production lane be considered.
