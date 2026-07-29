# UniHER Paola findings closure plan

**Date:** 2026-07-23
**Status:** PASS after F0 execution
**Scope:** close the current review findings before advancing from P7A into P5/P6/P8
**Source spec:** `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
**Current-state scorecard:** `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
**P7A scorecard:** `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md`
**Decision:** F0 is closed as a findings-correction lane. Do not promote the full redesign yet; open the next lane by priority.

## 1. Audit result against the plan

The plan is directionally correct and aligned with Dra. Paola's specification: P1-P4 are technical foundations, P7A is runtime/menu QA, and the complete product redesign remains `HOLD`.

The current gap is not a missing architecture plan. The gap is that the latest review findings need a small closure lane before the next implementation wave starts.

## 2. Original confirmed findings

| ID | Severity | Finding | Evidence | Required action |
|---|---:|---|---|---|
| F0.1 | P2 | One visible context string still lacks PT-BR accent. | `src/app/(platform)/saude-primaria/page.tsx:7` has `context="Saude Primaria"` while the title is `Saúde Primária`. | Patch to `Saúde Primária`; add/extend a copy regression if a suitable shell test exists. |
| F0.2 | P3 | RH dashboard evidence JSON can be misread as encoding failure. | `rh-dashboard-complete-metrics.json` has `badJoinedText: []` and `escapedUnicodeText: []`, but `mojibakeText` flags valid `ÃO`. | Regenerate metrics with a precise mojibake detector or record the field as false-positive in the scorecard. |
| F0.3 | P2 | Full visual approval is still blocked. | P7A scorecard says current sidebar is functional grouped navigation, not Dra. Paola's richer menu-card/numbered visual language. | Open a design-target decision lane before any visual rewrite. |
| F0.4 | P2 | `Meu Bem-Estar` remains incomplete against the request. | Contract and scorecard both say Check-in exists, but true Check-out and the daily pair are not complete. | Open P5 Check-out foundation. |
| F0.5 | P2 | RH/Admin dashboard comparison remains incomplete. | Contract requires Check-in x Check-out chart only after Check-out exists. | Open P6 only after P5 produces data and privacy-safe projections. |
| F0.6 | P3 | Worktree is broad/dirty and not promotion-ready. | Current diff spans 35 tracked files plus 2 untracked scorecards; `config.module.css` and `objectives.service.ts` show status noise with no semantic diff. | Before staging/promotion, run an allowlist review and keep LF/CRLF/status-only noise out of the commit. |
| F0.7 | P3 | Broader docs/test encoding debt exists outside P7A. | Broad scan previously found mojibake in old Yavix docs and one privacy test regex. | Separate cleanup lane; not a blocker for Paola P7A/P5 unless those files enter the write set. |

## 3. Closure lane F0 - before advancing

**Objective:** remove the small correctness/evidence ambiguities so the next wave starts from a clean gate.

**Write allowlist:**

- `src/app/(platform)/saude-primaria/page.tsx`
- focused shell/copy test only if already matching the surface
- `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md`
- `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Obsidian note `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md`

**Write denylist:**

- no visual redesign rewrite
- no Check-out data/API/UI yet
- no RH/Admin dashboard metric implementation yet
- no module mutation/admin activation
- no SIPAT content invention
- no Semaforo, Liga, NR-1/Yavix, Concierge or Denuncias production behavior
- no stage, commit, push or deploy

**Steps:**

- [x] Patch `context="Saude Primaria"` to `context="Saúde Primária"`.
- [x] Run the focused shell/module/copy tests that cover contained module pages.
- [x] Annotate RH completed-onboarding metrics so valid `ÃO` is not treated as mojibake.
- [x] Update P7A scorecard with `F0 CLOSED` receipts and keep visual approval as `HOLD`.
- [x] Update current-state scorecard so the next lane choice is explicit: P7B visual target, P5 Check-out, or P8 module management.
- [x] Run `git diff --check`.

**F0 pass condition:** no unresolved P2/P3 correctness/evidence finding remains that would pollute the next wave. Full redesign remains `HOLD`.

**Execution receipt:**

- Code patch: `src/app/(platform)/saude-primaria/page.tsx` now uses `context="Saúde Primária"`.
- Regression: `tests/unit/module-shells.test.ts` now asserts the accented context, blocks the old unaccented value and aligns the SIPAT source-needed assertion with the accented runtime copy.
- Evidence annotation: P7A scorecard records `rh-dashboard-complete-metrics.json` `mojibakeText: ["ÃO", ...]` as a detector false-positive because `badJoinedText` and `escapedUnicodeText` are empty and the precise scan already reported `real_mojibake_findings=0`.
- Validation: `npm run test:unit -- tests/unit/module-shells.test.ts` PASS, 1 file / 9 tests.
- Validation: `npm run test:unit -- tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx` PASS, 4 files / 62 tests.
- Validation: `npx tsc --noEmit` PASS.
- Validation: `git diff --check` PASS with LF/CRLF warnings only.

## 4. Next lane choices after F0

### Option A - P7B visual target decision

Use this if the next goal is to satisfy the visual language in Dra. Paola's images.

**Goal:** decide whether to keep the current grouped sidebar with polish or implement a richer card/numbered menu treatment.

**Required evidence:**

- desktop/mobile screenshots for Admin, RH and collaborator
- explicit comparison against the three Dra. Paola references
- no duplicate settings labels
- no overflow/fixed-nav occlusion
- independent coordinator decision: `KEEP`, `REDESIGN`, or `HOLD`

### Option B - P5 Check-out foundation

Use this if the next goal is product completeness for `Meu Bem-Estar`.

**Goal:** add Check-out as a first-class daily wellbeing event before any chart.

**Non-negotiables:**

- Check-in prompt: `Como você chega hoje?`
- Check-out prompt: `Como você encerra o seu dia?`
- self-only collaborator access
- no XP, ranking, Liga, Semaforo, health score, NR-1 or company health feed
- DSAR/deletion implications reviewed before storing new data

### Option C - P8 module-management governance

Use this if the next goal is Admin/RH control of contracted modules.

**Goal:** add explicit activation/deactivation mutations for company modules.

**Non-negotiables:**

- audit log
- tenant isolation
- explicit status transitions
- no default row creation on read
- no sensitive module behavior activated by the mutation itself

## 5. Recommended route

Recommended execution order:

1. F0 closure lane.
2. P5 Check-out foundation.
3. P6 RH/Admin aggregate dashboard with Check-in x Check-out and approved metrics.
4. P7B visual target decision/correction.
5. P8 module-management governance.

Reason: Dra. Paola's dashboard and `Meu Bem-Estar` requirements depend on Check-out data. Visual treatment can be advanced in parallel only if the coordinator freezes a target and keeps it separate from P5 data/privacy work.

## 6. Advancement gate

After F0, it is acceptable to advance only if all are true:

- `git diff --check` passes.
- No P0/P1/P2 review finding remains open.
- P7A remains accurately labeled as runtime/menu evidence, not full visual approval.
- The next lane has its own harness contract, write allowlist, denylist, validators and stop condition.
- The coordinator explicitly names one next lane: P7B, P5 or P8.
