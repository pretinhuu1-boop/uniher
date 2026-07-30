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

Validated follow-up lanes now cover global shell/session/wellbeing/reading controls and the first RH/Admin non-destructive open/navigation controls. The blocked inventory still contains controls that need local fixture validation before any production claim.

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

1. Global shell/session controls: logo/home button and logout/menu buttons across profiles. Completed in `docs/superpowers/audits/2026-07-30-uniher-local-clickable-fixture-shell-session.md`.
2. Disabled controls and read-only-looking filters: initial fixture lane completed with 20 PASS / 5 REVIEW / 0 FAIL; the 5 REVIEW items need seed or focused route-state follow-up.
3. Collaborator wellbeing controls: check-in/check-out, mood buttons and register-reading controls. Completed for the consolidated `/colaboradora` surface in `docs/superpowers/audits/2026-07-30-uniher-local-clickable-fixture-shell-session.md`.
4. RH/Admin non-destructive stateful/open controls: first fixture lane completed with 9 PASS / 0 REVIEW / 0 FAIL in `docs/superpowers/audits/2026-07-30-uniher-local-clickable-fixture-admin-rh.md`.
5. RH/Admin destructive and committed mutation controls: `Suspender`, `Bloquear`, `Excluir`, `Revogar`, `Resetar Senha`, import commit, completed create/update submissions, export/import and editorial/gamification content mutation flows still need isolated local DB lanes with rollback or fixture cleanup.
6. Remaining educational activity controls: true/false and other DailyLesson interaction types still need a focused local lane if they are present in the daily lesson fixture.

Only after those local lanes produce PASS evidence should any guarded production lane be considered.
