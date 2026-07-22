# UniHER session orchestration ledger

**Purpose:** live control file for accelerated UniHER redesign sessions.
**Coordinator rule:** this file is owned by the coordinator. Workers may read it. Workers update it only when explicitly assigned.

## Current Baseline

- Checkout: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Branch: `codex/uniher-wave3-collaborator-nr1`
- HEAD at ledger creation: `dbd44c0`
- Pre-existing untracked research: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`
- Current visual redesign local work:
  - `src/components/platform/ContainedSurfacePreview.tsx`
  - `src/app/(platform)/semaforo/page.tsx`
  - `src/app/(platform)/objetivos/page.tsx`
  - `src/app/(platform)/desafios/page.tsx`
  - `src/app/(platform)/conquistas/page.tsx`
  - `src/app/(platform)/liga/page.tsx`
- Rule: preserve all listed local work unless the coordinator explicitly revises it after diff review.

## Canonical Documents

Every worker session must load:

- `docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md`
- `docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md`
- `docs/superpowers/plans/2026-07-21-uniher-final-delivery-roadmap.md`
- `docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md`
- `docs/superpowers/audits/2026-07-21-uniher-end-to-end-production-redesign-audit.md`
- `docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md`

## Route And Lane Matrix

| Route | Current state | Lane owner | Promotion dependency | Notes |
| --- | --- | --- | --- | --- |
| `/colaboradora` | Functional/parcial | visual-primary-care | R6/check-out specs for deeper changes | Preserve check-in, safe missions and NR-1 preview labels. |
| `/agenda` | Functional | visual-primary-care | visual QA | Existing collaborator-self CRUD must remain private. |
| `/campanhas` | Functional/parcial | visual-education | visual QA | Can become Education hub visually without changing campaign APIs. |
| `/comunidade` | Wave 4 PASS | regression only | tenant/privacy regression | Do not reexecute Wave 4. |
| `/semaforo` | Contained visual redesign local | wave9-semaforo | clinical/privacy gate | No API/data activation before approval. |
| `/objetivos` | Functional self-only objectives local | wave6-objectives | PASS local validation | Stage only exact Wave 6 allowlist if user approves. |
| `/desafios` | Functional self-only company challenges local | wave7-challenges | PASS local validation | RH management route is separate and was not reactivated. |
| `/conquistas` | Functional private achievements local | wave8-achievements | PASS local validation | No legacy badges. |
| `/liga` | Contained visual redesign local | wave10-liga | policy approval + Waves 5 and 8 | Outside core unless formally approved. |
| `/avaliacao-nr1` | Scaffold | R2 NR-1 owner | Yavix payload/auth/scoring/consent | Do not mix with this redesign wave unless assigned. |

## Concurrency Rules

- Visual-only route work may run in parallel when write sets are disjoint.
- Migrations run serially under the coordinator.
- Wave 6, Wave 7 and Wave 8 implementation cannot promote before Wave 5.
- Semaforo and Liga are independent decision-gated lanes, not shortcuts around Wave 5.
- QA may run in parallel but cannot edit production code while reviewing.

## Harness/Loop Pilot Framework

Status: candidate framework. Apply it to new worker sessions now, but promote it to all future specs only after the pilot scorecard passes.

Pilot lane: `visual-contained-pages`.

Harness contract required for each worker:

- intent source;
- coordinator;
- worker lane;
- write allowlist;
- write denylist;
- runtime preflight;
- context pack;
- allowed commands;
- evidence outputs;
- verification gates;
- governance gates;
- stop conditions.

Worker loop required for each lane:

1. Preflight.
2. Observe.
3. Plan.
4. Act.
5. Verify.
6. Reflect.
7. Coordinator gate.

Promotion criteria:

- complete worker receipt;
- exact write-set containment;
- deterministic checks pass;
- screenshots exist for user-facing routes;
- independent QA has no unresolved P0/P1/P2;
- no public/auth/metadata/email/NR-1/Yavix scope drift;
- coordinator records PASS, HOLD, FAIL or BLOCKED with evidence.

## Active Lanes

| Lane | Owner/session | Status | Write set | Next gate |
| --- | --- | --- | --- | --- |
| orchestration | current session | in progress | docs/superpowers orchestration docs | scorecard |
| visual-contained-pages | current session/local work | PASS visual QA | five contained pages + `ContainedSurfacePreview.tsx` | stage only exact visual allowlist if user approves |
| wave5-ledger | current session | PASS foundation | Wave 5 ledger allowlist | explicit staging allowlist |
| wave6-objectives | current session | PASS local validation | Wave 6 objectives allowlist | explicit staging allowlist |
| wave7-challenges | current session | PASS local validation | Wave 7 challenge allowlist | explicit staging allowlist |
| wave8-achievements | current session | PASS local validation | Wave 8 achievements allowlist | explicit staging allowlist |
| wave9-semaforo | current session | PASS blocked/contained | docs scorecard only | clinical/privacy approval still required |
| wave10-liga | current session | PASS blocked/contained | docs scorecard only | product/legal policy approval still required |
| qa-independent | unassigned | waiting | receipts only | lane receipt request |

## Worker Receipt Schema

Every worker returns:

```markdown
### Receipt: <lane> / <date-time>

**Status:** PASS | FAIL | BLOCKED
**Objective:** <one sentence>
**Harness contract:** <intent source, lane, allowlist, denylist, preflight, context pack, commands, evidence, gates, stop conditions>
**Loop result:** <preflight, observe, plan, act, verify, reflect, coordinator gate readiness>
**Write set assigned:** <files/directories>
**Files read:** <list>
**Files changed:** <list>
**Commands run:**
- `<command>` -> PASS/FAIL, key counts
**Screenshots:**
- `<path or not applicable with reason>`
**Privacy/role checks:** <specific checks>
**Diff summary:** <short summary>
**Remaining gaps:** <list or none>
**Promotion recommendation:** promote | hold | blocked
```

## Coordinator Decisions

| Date | Decision | Evidence | Status |
| --- | --- | --- | --- |
| 2026-07-21 | Adopt centralized coordinator + bounded worker-session model for accelerated redesign. | `2026-07-21-uniher-accelerated-redesign-orchestration-design.md` | active |
| 2026-07-21 | Treat current five-page visual redesign as local work pending coordinator diff review; do not stage automatically. | git status + screenshots previously captured under projectless outputs | hold |
| 2026-07-22 | Adopt harness/loop engineering as candidate framework and pilot it first on `visual-contained-pages`. | `2026-07-22-uniher-harness-loop-engineering-research.md` | pilot |
| 2026-07-22 | Mark `visual-contained-pages` PASS for visual QA and promote harness/loop as the default framework for future UniHER specs. | `docs/superpowers/audits/2026-07-22-uniher-visual-contained-pages-pilot-scorecard.md` + independent QA re-review | active |
| 2026-07-22 | Hold `wave5-ledger` as decision-gated; do not create migration 056, participation service, repository or writer tests before the decision packet approvals are complete. | `docs/superpowers/audits/2026-07-22-uniher-wave5-ledger-preflight.md` + decision packet lines 3-33 | blocked |
| 2026-07-22 | Open `wave5-ledger` implementation under the recommended conservative v1: hard-delete, no metadata, no points/ranking and no sensitive sources. | operator decision "vamos com o recomendado" + `docs/superpowers/specs/2026-07-21-uniher-eligible-participation-ledger-design.md` | active |
| 2026-07-22 | Mark `wave5-ledger` PASS for foundation implementation; release Wave 6 and Wave 7 for child-plan execution. | `docs/superpowers/audits/2026-07-22-uniher-wave5-ledger-scorecard.md` + unit/privacy/typecheck/build evidence | active |
| 2026-07-22 | Close Wave 5 audit gaps: DSAR exports eligible participation, Admin/RH fulfilled deletion hard-deletes ledger rows, and producer service stays transaction-scoped. | `src/lib/privacy/dsar-export.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/rh/users/[id]/route.ts`, participation tests | active |
| 2026-07-22 | Mark `wave6-objectives` PASS local validation: self-only objectives, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave6-objectives-scorecard.md` + outputs `uniher-wave6-objectives-2026-07-22` | active |
| 2026-07-22 | Mark `wave7-challenges` PASS local validation: self-only company challenges, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave7-challenges-scorecard.md` + outputs `uniher-wave7-challenges-2026-07-22` | active |
| 2026-07-22 | Mark `wave8-achievements` PASS local validation: private deterministic achievements, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave8-achievements-scorecard.md` + outputs `uniher-wave8-achievements-2026-07-22` | active |
| 2026-07-22 | Mark `wave9-semaforo` and `wave10-liga` PASS blocked/contained: no production behavior activated; Semaforo/Liga remain decision-gated. | `docs/superpowers/audits/2026-07-22-uniher-wave9-10-blocked-scope-scorecard.md` | active |

## Promotion Checklist

Before any lane is marked PASS:

- [ ] Assigned write set matches actual changed files.
- [ ] No unrelated files are included.
- [ ] `git diff --check` is clean.
- [ ] TypeScript passes if source code changed.
- [ ] Focused unit/privacy tests pass.
- [ ] Build passes if app code changed.
- [ ] Harness contract is complete for the lane.
- [ ] Worker loop receipt covers preflight, observe, plan, act, verify and reflect.
- [ ] Desktop/mobile screenshots exist for user-facing route changes.
- [ ] Independent review has no unresolved P0/P1/P2.
- [ ] Scorecard is written under `docs/superpowers/audits/`.

## Open Risks

- The current worktree contains uncommitted visual redesign changes. New sessions must preserve them.
- Semaforo and Liga remain decision-gated; visual surfaces must not imply production activation.
- Wave 6 passed local validation and post-wave diff review; explicit staging allowlist is still required before commit/promotion.
- Wave 7 passed local validation and browser evidence; explicit staging allowlist is still required before commit/promotion.
- Wave 8 passed local validation and browser evidence; explicit staging allowlist is still required before commit/promotion.
- Wave 5 scheduled retention cleanup remains a future job spec, not an active background deletion process.
- NR-1/Yavix work remains outside this orchestration unless explicitly assigned to R2/R7 lanes.
- Visual wave staging must be allowlisted manually because orchestration/research docs are also untracked in the same worktree.
