# UniHER post-audit findings correction orchestration

**Date:** 2026-07-23
**Status:** executed
**Scope:** correction plans for waves/l lanes that returned findings in the one-session-per-wave audit
**Coordinator:** current UniHER worktree coordinator
**Source:** results from separate Codex audit sessions created on 2026-07-23

## Decision

Do not advance to P5/P6 or promote the current worktree until the P1 findings are fixed:

1. Wave 8 achievement revocation idempotency.
2. Paola P4A/P4 NR-1/COPSOQ default navigation gate.

P2/P3 findings can be corrected in the same cleanup round, but they must not distract from the two P1 blockers.

## Correction Matrix

| Plan | Severity | Decision Before Fix | Objective |
|---|---:|---|---|
| `2026-07-23-uniher-wave8-achievements-revocation-correction.md` | P1/P2 | HOLD | Make revoked achievements idempotent and refresh mobile evidence. |
| `2026-07-23-uniher-paola-nr1-default-gate-correction.md` | P1 | HOLD | Prevent NR-1/COPSOQ runtime from being navigable by default through module-aware menus. |
| `2026-07-23-uniher-visual-contained-pages-reconciliation.md` | P2 | HOLD | Reclassify visual-contained-pages as historical PASS only, not current-state PASS. |
| `2026-07-23-uniher-wave7-scorecard-count-correction.md` | P3 | PASS with docs finding | Update stale test count evidence. |
| `2026-07-23-uniher-p7a-evidence-refresh.md` | P3 | PASS with evidence finding | Refresh or annotate stale P7A `metrics.json` after PT-BR copy polish. |
| `2026-07-23-uniher-paola-doc-tree-next-gates-correction.md` | P3 | PASS with docs finding | Remove stale next-gate wording from historical doc-tree/ledger references. |

## Global Harness

**Write denylist for every correction lane:**

- no production deploy
- no staging/commit/push without explicit operator approval
- no Yavix provisioning inference
- no Semaforo production behavior
- no Liga/ranking production behavior
- no SIPAT content invention
- no Concierge case workflow
- no Canal de Denuncias intake/tracking workflow
- no Check-out/P5 implementation unless explicitly opened

**Required loop for each lane:**

1. Preflight: `git status -sb`, read this plan and target lane plan.
2. Observe: read target source, scorecard and focused tests.
3. Plan: confirm exact write allowlist before editing.
4. Act: patch only the lane allowlist.
5. Verify: focused tests, `npx tsc --noEmit` when TS changed, `git diff --check`.
6. Reflect: update scorecard/ledger/Obsidian receipt.
7. Coordinator gate: classify `PASS`, `PASS WITH RESIDUAL P3`, `HOLD` or `FAIL`.

## Recommended Execution Order

1. Wave 8 revocation idempotency.
2. Paola NR-1 default gate.
3. P7A evidence refresh.
4. Wave 7 scorecard count.
5. Paola doc-tree next gates.
6. visual-contained-pages reconciliation.

Reason: the first two can affect behavior and promotion safety; the rest are evidence/documentation hygiene.

## Execution Results

| Plan | Result | Receipt |
|---|---|---|
| `2026-07-23-uniher-wave8-achievements-revocation-correction.md` | PASS | RED/GREEN added for repeated revocation sync; `revoked` no longer downgrades to `in_progress`; mobile bottom evidence downgraded to historical/weak unless recaptured. |
| `2026-07-23-uniher-paola-nr1-default-gate-correction.md` | PASS | Added locked `/nr1` shell; `requires_contract` rows route to `/nr1`; explicit `enabled` rows can still route to `/avaliacao-nr1`. |
| `2026-07-23-uniher-p7a-evidence-refresh.md` | PASS | Raw `metrics.json` classified as pre-polish; `rh-dashboard-complete-metrics.json` set as post-polish label evidence. |
| `2026-07-23-uniher-wave7-scorecard-count-correction.md` | PASS | Focused Wave 7 suite rerun and scorecard updated from 52 to 53 tests. |
| `2026-07-23-uniher-paola-doc-tree-next-gates-correction.md` | PASS | Historical doc-tree lane marked closed/superseded; stale P1/P1A next gate removed from active ledger. |
| `2026-07-23-uniher-visual-contained-pages-reconciliation.md` | PASS | Visual-contained pilot preserved as historical PASS; current functional route approval delegated to Wave 6/7/8 evidence. |

## Final Gate

- Behavior-impacting corrections passed focused tests and TypeScript.
- Documentation/evidence corrections passed diff hygiene.
- No production deploy, commit, push, Yavix provisioning, Semaforo production behavior, Liga/ranking behavior, SIPAT content, Concierge workflow, Denuncias workflow or P5/P6 implementation was opened.
- Full Dra. Paola visual approval remains HOLD.
