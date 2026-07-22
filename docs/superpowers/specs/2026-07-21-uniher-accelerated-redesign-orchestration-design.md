# UniHER accelerated redesign orchestration design

**Status:** approved planning direction, not implementation approval
**Scope:** authenticated internal UniHER platform in `codex/uniher-wave3-collaborator-nr1`
**Primary objective:** accelerate page-by-page redesign over the existing product without breaking privacy gates, role boundaries, runtime behavior, or the approved visual direction.

## 1. Problem

The project has a working redesigned foundation, but the remaining delivery pressure is high. Starting each new session from raw repository discovery wastes time and increases risk. The platform also contains deliberate containment around Semaforo, Objetivos, Desafios, Conquistas and Liga, so a generic "make it functional" instruction can accidentally reconnect legacy points, rankings, health scores, or sensitive data.

The accelerated process needs one coordinator that owns source-of-truth state, while focused sessions execute bounded slices with explicit write sets and evidence.

## 2. Current state

Canonical checkout:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

Branch:

`codex/uniher-wave3-collaborator-nr1`

Latest audited HEAD before local planning work:

`dbd44c0`

Relevant local uncommitted redesign work at the time of this design:

- Modified: `src/app/(platform)/semaforo/page.tsx`
- Modified: `src/app/(platform)/objetivos/page.tsx`
- Modified: `src/app/(platform)/desafios/page.tsx`
- Modified: `src/app/(platform)/conquistas/page.tsx`
- Modified: `src/app/(platform)/liga/page.tsx`
- Untracked: `src/components/platform/ContainedSurfacePreview.tsx`
- Pre-existing untracked research: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`

The local redesign work has already been validated once with TypeScript, focused privacy containment tests, production build, and authenticated desktop/mobile screenshots. It is not committed and must be treated as user-owned work until explicitly staged or discarded.

## 3. Canonical documents every session must load

Every implementation or audit session starts by reading:

- `docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md`
- `docs/superpowers/plans/2026-07-21-uniher-final-delivery-roadmap.md`
- `docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md`
- `docs/superpowers/audits/2026-07-21-uniher-end-to-end-production-redesign-audit.md`
- `docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md`
- `docs/superpowers/plans/2026-07-20-uniher-collaborator-placeholder-repair.md`
- `docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/plans/2026-07-21-uniher-session-prompt-template.md`
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md`

Sessions working on visual surfaces also inspect the current files for their assigned route before editing. They do not trust prior screenshots as current truth.

## 4. Operating model

Use a centralized supervisor model.

The coordinator owns:

- branch and worktree state;
- write-set allocation;
- shared docs, roadmap, ledger, scorecards and prompt templates;
- integration diffs;
- promotion decisions;
- final evidence bundle.

Worker sessions own exactly one bounded lane. A worker may inspect broad context, but writes only inside its assigned allowlist. If the task requires a shared file not in the allowlist, the worker records a blocker and returns to the coordinator.

Workers do not promote their own work. They produce receipts. The coordinator verifies receipts against source, tests, screenshots and diff.

## 4A. Harness and loop engineering contract

Status: candidate framework under pilot. It becomes mandatory for all UniHER specs only after the `visual-contained-pages` pilot passes independent review.

Working definitions:

- Harness engineering is the design of everything around the model: source docs, ledger, route matrix, prompt template, write allowlist, denylist, tools, test commands, browser screenshots, receipts, scorecards and promotion gates.
- Loop engineering is the repeated worker cycle: preflight, observe, plan, act, verify, reflect and stop or escalate.

Every worker lane must receive a compact harness contract:

```markdown
**Intent source:** <roadmap/spec/decision packet>
**Coordinator:** <session or role>
**Worker lane:** <single bounded lane>
**Write allowlist:** <exact files/directories>
**Write denylist:** <never touch list>
**Runtime preflight:** <git status, branch, env, server, auth state>
**Context pack:** <ordered docs/files to read>
**Allowed commands:** <commands with expected output>
**Evidence outputs:** <screenshots, logs, receipts, scorecard paths>
**Verification gates:** <tests/build/typecheck/browser/privacy/role gates>
**Governance gates:** <clinical, legal, DPO, product, tenant/privacy gates>
**Stop conditions:** PASS, FAIL, BLOCKED, ESCALATE, HOLD
```

Every worker lane must execute the same loop:

1. Preflight: confirm branch, dirty files and assigned write set.
2. Observe: read canonical docs and assigned route/source files.
3. Plan: name the smallest change and validators before editing.
4. Act: edit only allowlisted files and preserve existing local work.
5. Verify: run deterministic checks and screenshots when visual.
6. Reflect: return a receipt with evidence, risks and result classification.
7. Coordinator gate: coordinator decides promotion after independent review.

Minimum harness coverage follows the ETCLOVG checklist from the research artifact: Execution, Tooling, Context, Lifecycle, Observability, Verification and Governance.

## 5. Lane model

### Lane A - Orchestration and integration

Purpose: maintain this operating system, ledger, matrix and final review.

Allowed writes:

- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md`
- `docs/superpowers/plans/2026-07-21-uniher-session-prompt-template.md`
- wave scorecards under `docs/superpowers/audits/`

### Lane B - Visual redesign over existing routes

Purpose: apply the approved redesign language to existing authenticated pages while preserving runtime logic.

Allowed writes are assigned per route. A visual worker should usually touch only:

- the route `page.tsx`, `loading.tsx`, `error.tsx`;
- route-local components if they already exist;
- shared visual components only if the coordinator explicitly assigns them.

Visual lane must not add new business APIs, migrations or data contracts.

### Lane C - Privacy-safe participation foundation

Purpose: implement Wave 5 eligible participation ledger after decisions are confirmed.

Allowed writes come from the Wave 5 plan only. This lane owns migrations and participation service/repository files. It must not change Semaforo, NR-1, Liga or public ranking behavior.

### Lane D - Objetivos, Desafios and Conquistas

Purpose: implement Waves 6-8 on top of the eligible ledger.

These lanes may run specs and UI preparation in parallel, but mutable implementation promotes serially:

1. Wave 5 ledger
2. Wave 6 Objetivos
3. Wave 7 Desafios
4. Wave 8 Conquistas

### Lane E - Semaforo

Purpose: prepare and eventually implement private self-report Semaforo.

This lane stays blocked for production behavior until self-report, clinical copy, consent, retention, deletion and audience are approved. It never writes to the participation ledger and never feeds Objectives, Challenges, Achievements, Liga, Community, NR-1 or RH reporting.

### Lane F - Liga

Purpose: policy decision and future implementation only.

Liga remains outside the core delivery unless legal/product explicitly approves a model. Named ranking is not approved by default.

### Lane G - Independent QA and visual review

Purpose: verify route behavior, role boundaries, visual fit and mobile safety from fresh evidence.

QA writes only receipts and, when explicitly assigned, snapshot updates. It must not repair production code while reviewing.

## 6. Hard guardrails

Do not:

- reset, checkout, stash, clean or revert user-owned work;
- touch landing/public/metadata/email unless assigned;
- reactivate legacy `points`, `level`, `league`, `badges`, `user_badges`, `health_scores`, legacy objective progress or legacy challenge progress;
- claim visual approval from build or DOM tests;
- promote Semaforo without the privacy/clinical gate;
- promote Liga without policy approval;
- run two migration-owning waves at the same time;
- stage screenshots, databases, Playwright reports or unrelated changes.

## 7. Definition of ready for a worker session

Before a worker edits, the coordinator provides:

- lane name;
- objective;
- source documents to read;
- exact write allowlist;
- exact denylist;
- current git status summary;
- expected tests;
- screenshot requirements;
- receipt template;
- explicit instruction to preserve pre-existing changes.

## 8. Definition of done for a worker session

A worker is done only when its receipt contains:

- files read;
- files changed;
- decisions made;
- tests run with exact command and result;
- desktop/mobile screenshots or reason they are not applicable;
- privacy and role-boundary checks;
- diff summary;
- remaining gaps;
- PASS, FAIL or BLOCKED decision.

PASS cannot be issued with unresolved P0/P1/P2 findings.

## 9. Evidence matrix

Minimum checks for visual-only route redesign:

- `git diff --check`
- `npx tsc --noEmit`
- focused unit tests covering touched primitives or containment
- `npm run build`
- authenticated screenshots at `390x844` and `1440x900`
- no horizontal overflow
- no content hidden under fixed mobile nav in the first viewport
- one visible `h1`
- visible blocked/unavailable state when the domain is intentionally contained

Minimum checks for data-bearing waves:

- failing policy tests before implementation when feasible;
- focused unit tests for service/repository/policy;
- relevant privacy containment suites;
- negative role and tenant tests;
- TypeScript;
- build;
- browser route checks with screenshots for each user-facing state.

## 10. Promotion rule

The coordinator may mark a lane as promoted only after independent verification. A worker receipt is input evidence, not approval.

Every promotion updates:

- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- a wave scorecard under `docs/superpowers/audits/`
- the route/state matrix if route behavior changed

No PR, push, merge or deploy happens without explicit user authorization.

## 11. Recommended immediate sequence

1. Consolidate the current five-page visual redesign as a controlled visual wave or revise it before staging.
2. Add focused route visual tests for the contained pages so future agents cannot regress to blank placeholders.
3. Prepare Wave 5 ledger decisions and plan, but do not open migration 056 until decision gates are satisfied.
4. Execute Objetivos, Desafios and Conquistas only after Wave 5 is green.
5. Keep Semaforo and Liga as separate decision-gated lanes.

## 12. Self-review

Placeholder scan: no unfinished placeholder markers remain.

Consistency check: this design preserves the existing roadmap dependency order while adding a faster session orchestration layer.

Scope check: this is an orchestration design, not a product implementation spec. Individual product waves still need their child specs and plans.

Ambiguity check: workers cannot infer write scope; the coordinator must provide it explicitly for every session.
