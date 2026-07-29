# UniHER visual-contained-pages reconciliation plan

**Date:** 2026-07-23
**Status:** executed
**Wave:** visual-contained-pages
**Current decision:** HOLD for current-state promotion
**Finding source:** separate visual-contained-pages audit session

## Finding

P2: `visual-contained-pages` PASS is valid as historical evidence, but not as a current-state PASS.

Reason:

- The scorecard was captured at an older HEAD.
- Current routes `/objetivos`, `/desafios` and `/conquistas` have evolved into functional self-only flows.
- Treating the old contained-pages screenshots as current visual approval would be misleading.

## Harness

**Write allowlist:**

- `docs/superpowers/audits/2026-07-22-uniher-visual-contained-pages-pilot-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- optional current-state scorecard

**Write denylist:**

- no route/code changes
- no screenshots unless a new visual QA lane is explicitly opened
- no rollback of Wave 6/7/8 functional routes

## Tasks

- [x] Update the visual-contained scorecard with a section `Historical PASS / current-state HOLD`.
- [x] Update ledger row from current `PASS visual QA` wording to `historical PASS; current routes superseded`.
- [x] State that `/semaforo` and `/liga` still remain contained, while `/objetivos`, `/desafios`, `/conquistas` are covered by Wave 6/7/8 evidence instead.
- [x] If visual approval is needed for current routes, open a separate current visual QA lane.

## Execution Receipt

- `visual-contained-pages` is now historical PASS, not current-state PASS for all five original routes.
- `/semaforo` and `/liga` remain contained/blocked.
- `/objetivos`, `/desafios` and `/conquistas` are superseded by Wave 6/7/8 functional evidence.
- Current visual approval for those functional routes requires a separate current visual QA lane.

## Verification

Run:

```powershell
git diff --check -- docs/superpowers/audits/2026-07-22-uniher-visual-contained-pages-pilot-scorecard.md docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md
```

## Pass Gate

- No doc implies old screenshots are approval of the current functional pages.
- Historical evidence remains preserved.
