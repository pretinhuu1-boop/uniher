# UniHER Accelerated Redesign Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and operate a coordinator-led workflow that lets new Codex sessions apply the UniHER redesign quickly without breaking specs, containment, privacy, roles, or existing runtime behavior.

**Architecture:** A single coordinator owns the living ledger, write-set allocation, integration diff, evidence review and promotion decisions. Worker sessions receive one bounded lane, explicit allowlists and required evidence. Visual redesign, ledger/data work, Semaforo and Liga decisions stay separate so speed does not collapse privacy gates.

**Harness/loop pilot:** The orchestration now treats harness engineering as the control plane and loop engineering as the worker execution cycle. This framework is documented as a pilot first; promote it across future specs only after `visual-contained-pages` passes independent QA.

**Tech Stack:** Next.js App Router, TypeScript, SQLite, Vitest, Playwright, Git worktrees, Codex background threads, Superpowers brainstorming/writing-plans/subagent-driven-development/requesting-code-review/verification-before-completion.

---

## File responsibilities

- `docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md` defines the orchestration design and non-negotiable boundaries.
- `docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md` is this executable plan.
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` is the live operating ledger for every session, lane, write set, evidence and promotion decision.
- `docs/superpowers/plans/2026-07-21-uniher-session-prompt-template.md` is the copy/paste prompt template for new sessions or background threads.
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md` is the source-backed framework research for harness/loop adoption.
- Wave scorecards live under `docs/superpowers/audits/`.

## Harness/Loop Adoption Rule

- Use the harness contract and worker loop for every new worker session immediately.
- Treat the framework as a pilot until `visual-contained-pages` passes with screenshots, tests, diff review and independent QA.
- Do not promote harness/loop into every UniHER spec until the pilot scorecard shows lower drift without weakening privacy, containment or visual evidence.
- If the pilot fails, keep the research artifact and fall back to coordinator + bounded workers without broader framework rollout.

## Task 1: Freeze Current State Into The Ledger

**Files:**

- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

- [ ] **Step 1: Capture git baseline**

Run:

```powershell
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' status --short --branch
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' rev-parse --short HEAD
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' diff --name-only
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' ls-files --others --exclude-standard
```

Expected:

- branch is `codex/uniher-wave3-collaborator-nr1`;
- HEAD is recorded;
- existing modified and untracked files are listed;
- no destructive command is run.

- [ ] **Step 2: Update the ledger baseline section**

Add or update the `Current Baseline` section with:

```markdown
## Current Baseline

- Checkout: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Branch: `codex/uniher-wave3-collaborator-nr1`
- HEAD: `<output of git rev-parse --short HEAD>`
- Pre-existing untracked research: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`
- Current visual redesign local work:
  - `src/components/platform/ContainedSurfacePreview.tsx`
  - `src/app/(platform)/semaforo/page.tsx`
  - `src/app/(platform)/objetivos/page.tsx`
  - `src/app/(platform)/desafios/page.tsx`
  - `src/app/(platform)/conquistas/page.tsx`
  - `src/app/(platform)/liga/page.tsx`
- Rule: preserve all listed local work unless the coordinator explicitly revises it after diff review.
```

- [ ] **Step 3: Verify the ledger diff**

Run:

```powershell
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' diff -- docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md
```

Expected: the diff records current state only and does not claim promotion.

## Task 2: Create The Session Prompt Template

**Files:**

- Modify: `docs/superpowers/plans/2026-07-21-uniher-session-prompt-template.md`

- [ ] **Step 1: Write the standard prompt shell**

Add the prompt template exactly in the target file:

```markdown
# UniHER Worker Session Prompt Template

Use this prompt when creating a new Codex session for the authenticated UniHER platform.

```text
You are a bounded worker for the UniHER authenticated internal-platform redesign.

Canonical checkout:
C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1

Branch:
codex/uniher-wave3-collaborator-nr1

Lane:
[LANE NAME]

Objective:
[ONE-SENTENCE OBJECTIVE]

Required source documents:
- docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md
- docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md
- docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md
- docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md
- docs/superpowers/plans/2026-07-21-uniher-final-delivery-roadmap.md
- docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md
- docs/superpowers/audits/2026-07-21-uniher-end-to-end-production-redesign-audit.md
- docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md

Write allowlist:
[EXACT FILES OR DIRECTORIES]

Write denylist:
- public landing, metadata and email surfaces unless explicitly assigned
- migrations unless this is the active migration-owning lane
- Semaforo data/API behavior unless this is the approved Semaforo lane
- Liga behavior unless policy gate is approved
- legacy points, ranking, badges, league, health_scores, user_badges and legacy progress stores
- unrelated docs, screenshots, databases and Playwright reports

Harness contract:
- Intent source: [ROADMAP/SPEC/DECISION PACKET]
- Coordinator: [COORDINATOR SESSION OR ROLE]
- Worker lane: [LANE NAME]
- Runtime preflight: git status, branch, HEAD, dirty files, env/server/auth state if route validation is required
- Context pack: required docs above plus assigned source files
- Allowed commands: [COMMAND LIST]
- Evidence outputs: receipt, screenshots when visual, scorecard path when assigned
- Verification gates: [TESTS/TYPECHECK/BUILD/BROWSER/PRIVACY/ROLE CHECKS]
- Governance gates: [CLINICAL/LEGAL/DPO/PRODUCT/TENANT GATES OR NOT APPLICABLE]
- Stop conditions: PASS, FAIL, BLOCKED, ESCALATE, HOLD

Required workflow:
1. Preflight: audit current git status and confirm the assigned write set.
2. Observe: read the required docs and the assigned route/source files.
3. Plan: define the smallest safe change and name validators before editing.
4. Act: preserve pre-existing local work. Do not reset, revert, stash, clean or checkout.
5. Verify: run the required checks named by the coordinator.
6. Capture screenshots when the lane is visual or user-facing.
7. Reflect: return a receipt with files read, files changed, commands/results, screenshots, risks, remaining gaps and PASS/FAIL/BLOCKED.

Promotion rule:
You cannot promote your own work. The coordinator decides after independent verification.
```
```

- [ ] **Step 2: Add lane-specific examples**

Append these lane names with short usage notes:

```markdown
## Lane examples

- `visual-contained-pages`: redesign existing contained pages without changing APIs or data contracts.
- `wave5-ledger`: implement eligible participation after decisions are confirmed; owns migration 056.
- `wave6-objectives`: implement self-only objectives after Wave 5 passes.
- `wave7-challenges`: implement voluntary company challenges after Wave 5 passes.
- `wave8-achievements`: implement private achievements after Waves 5-7 contracts are stable.
- `wave9-semaforo`: prepare or implement private self-report only after clinical/privacy approvals.
- `wave10-liga`: policy-only unless legal/product gates are approved.
- `qa-independent`: verify screenshots, tests, overflow, focus, privacy and role boundaries; writes receipts only.
```

- [ ] **Step 3: Verify no placeholders are left in required fields**

Run:

```powershell
$pattern = ('TB' + 'D|TO' + 'DO')
Select-String -LiteralPath 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1\docs\superpowers\plans\2026-07-21-uniher-session-prompt-template.md' -Pattern $pattern
```

Expected: no matches. The bracketed `[LANE NAME]`, `[ONE-SENTENCE OBJECTIVE]` and `[EXACT FILES OR DIRECTORIES]` remain intentional fill-in slots for the coordinator.

## Task 3: Define The Route And Lane Matrix

**Files:**

- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

- [ ] **Step 1: Add the route matrix**

Add:

```markdown
## Route And Lane Matrix

| Route | Current state | Lane owner | Promotion dependency | Notes |
| --- | --- | --- | --- | --- |
| `/colaboradora` | Functional/parcial | visual-primary-care | R6/check-out specs for deeper changes | Preserve check-in, safe missions and NR-1 preview labels. |
| `/agenda` | Functional | visual-primary-care | visual QA | Existing collaborator-self CRUD must remain private. |
| `/campanhas` | Functional/parcial | visual-education | visual QA | Can become Education hub visually without changing campaign APIs. |
| `/comunidade` | Wave 4 PASS | regression only | tenant/privacy regression | Do not reexecute Wave 4. |
| `/semaforo` | Contained visual redesign local | wave9-semaforo | clinical/privacy gate | No API/data activation before approval. |
| `/objetivos` | Contained visual redesign local | wave6-objectives | Wave 5 ledger PASS | Visual-only changes may stay contained. |
| `/desafios` | Contained visual redesign local | wave7-challenges | Wave 5 ledger PASS | RH management route is separate. |
| `/conquistas` | Contained visual redesign local | wave8-achievements | Waves 5-7 contracts stable | No legacy badges. |
| `/liga` | Contained visual redesign local | wave10-liga | policy approval + Waves 5 and 8 | Outside core unless formally approved. |
| `/avaliacao-nr1` | Scaffold | R2 NR-1 owner | Yavix payload/auth/scoring/consent | Do not mix with this redesign wave unless assigned. |
```

- [ ] **Step 2: Add lane concurrency rules**

Add:

```markdown
## Concurrency Rules

- Visual-only route work may run in parallel when write sets are disjoint.
- Migrations run serially under the coordinator.
- Wave 6, Wave 7 and Wave 8 implementation cannot promote before Wave 5.
- Semaforo and Liga are independent decision-gated lanes, not shortcuts around Wave 5.
- QA may run in parallel but cannot edit production code while reviewing.
```

- [ ] **Step 3: Verify the matrix mentions every pending route**

Run:

```powershell
Select-String -LiteralPath 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1\docs\superpowers\SESSION_ORCHESTRATION_LEDGER.md' -Pattern '/semaforo|/objetivos|/desafios|/conquistas|/liga'
```

Expected: all five routes appear.

## Task 4: Define The Worker Receipt Format

**Files:**

- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Modify: `docs/superpowers/plans/2026-07-21-uniher-session-prompt-template.md`

- [ ] **Step 1: Add receipt schema to the ledger**

Add:

```markdown
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
```

- [ ] **Step 2: Add receipt requirement to prompt template**

In the prompt template, ensure the worker is instructed to output exactly the same receipt schema.

- [ ] **Step 3: Verify receipt schema exists in both files**

Run:

```powershell
Select-String -LiteralPath 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1\docs\superpowers\SESSION_ORCHESTRATION_LEDGER.md','C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1\docs\superpowers\plans\2026-07-21-uniher-session-prompt-template.md' -Pattern 'Worker Receipt|Receipt:'
```

Expected: both files contain the receipt language.

## Task 5: Close The First Orchestration Gate

**Files:**

- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Create: `docs/superpowers/audits/2026-07-21-uniher-accelerated-redesign-orchestration-scorecard.md`

- [ ] **Step 1: Run documentation and repo checks**

Run:

```powershell
git -C 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1' diff --check
npx tsc --noEmit
npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts
npm run build
```

Expected:

- `git diff --check` has no whitespace errors;
- TypeScript exits 0;
- focused privacy tests pass;
- build exits 0. The known Turbopack/NFT warning may remain.

- [ ] **Step 2: Write the scorecard**

Create the scorecard with:

```markdown
# Accelerated redesign orchestration scorecard

**Scope:** orchestration docs only
**Decision:** PASS | FAIL

## Evidence

| Check | Result |
| --- | --- |
| git status reviewed | |
| git diff --check | |
| TypeScript | |
| focused privacy containment tests | |
| build | |
| harness contract present | |
| worker loop receipt present | |
| desktop/mobile screenshots reviewed when visual | |
| independent QA decision | |

## Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |

## Decision

State whether the orchestration package is ready for worker-session use.
```

- [ ] **Step 3: Update the ledger with the scorecard decision**

Append the scorecard path and decision under `Coordinator Decisions`.

- [ ] **Step 4: Stop before commit or PR**

Do not commit, stage, push, open PR, merge or deploy unless the user explicitly authorizes it.

## Self-review

Spec coverage: this plan implements the approved orchestration design through ledger, prompt template, route matrix, receipt format, scorecard and the harness/loop pilot.

Placeholder scan: no unfilled placeholder markers are present. Bracketed prompt variables are intentional coordinator input slots.

Type consistency: lane names and route names match the design doc.

Execution boundary: this plan does not implement product behavior. It prepares sessions to implement later waves safely.

## Task 6: Pilot The Harness/Loop Framework

**Files:**

- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Modify: `docs/superpowers/audits/<assigned-harness-loop-pilot-scorecard>.md`

- [ ] **Step 1: Assign the pilot lane**

Use `visual-contained-pages` as the first pilot because it is user-facing, already contained and has deterministic privacy tests plus desktop/mobile screenshot requirements.

- [ ] **Step 2: Require the harness contract in the worker prompt**

The coordinator must fill:

- intent source;
- worker lane;
- write allowlist and denylist;
- runtime preflight;
- context pack;
- allowed commands;
- evidence outputs;
- verification gates;
- governance gates;
- stop conditions.

- [ ] **Step 3: Require the worker loop receipt**

The worker receipt must explicitly report:

- preflight result;
- observe sources;
- plan summary;
- act/write set;
- verification commands and screenshots;
- reflection risks;
- final PASS, FAIL, BLOCKED or HOLD.

- [ ] **Step 4: Decide framework promotion**

Promote harness/loop to the global UniHER spec style only if the pilot:

- keeps all writes inside the lane allowlist;
- produces complete receipts and screenshots;
- catches or rules out visual/privacy/containment issues;
- reduces coordinator ambiguity;
- does not add process overhead that blocks delivery.
