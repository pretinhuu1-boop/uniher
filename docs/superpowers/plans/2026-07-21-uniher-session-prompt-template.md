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
1. Preflight: audit git status and confirm the assigned write set.
2. Observe: read the required docs and the assigned route/source files.
3. Plan: define the smallest safe change and name validators before editing.
4. Act: preserve pre-existing local work. Do not reset, revert, stash, clean or checkout.
5. Verify: run the required checks named by the coordinator.
6. Capture screenshots when the lane is visual or user-facing.
7. Reflect: return a receipt with files read, files changed, commands/results, screenshots, risks, remaining gaps and PASS/FAIL/BLOCKED.

Promotion rule:
You cannot promote your own work. The coordinator decides after independent verification.
```

## Lane examples

- `visual-contained-pages`: redesign existing contained pages without changing APIs or data contracts.
- `wave5-ledger`: implement eligible participation after decisions are confirmed; owns migration 056.
- `wave6-objectives`: implement self-only objectives after Wave 5 passes.
- `wave7-challenges`: implement voluntary company challenges after Wave 5 passes.
- `wave8-achievements`: implement private achievements after Waves 5-7 contracts are stable.
- `wave9-semaforo`: prepare or implement private self-report only after clinical/privacy approvals.
- `wave10-liga`: policy-only unless legal/product gates are approved.
- `qa-independent`: verify screenshots, tests, overflow, focus, privacy and role boundaries; writes receipts only.

## Worker receipt

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

## Coordinator fill-in examples

### visual-contained-pages

```text
Lane:
visual-contained-pages

Objective:
Review and refine the contained redesign for /semaforo, /objetivos, /desafios, /conquistas and /liga without changing APIs or data behavior.

Write allowlist:
- src/components/platform/ContainedSurfacePreview.tsx
- src/app/(platform)/semaforo/page.tsx
- src/app/(platform)/objetivos/page.tsx
- src/app/(platform)/desafios/page.tsx
- src/app/(platform)/conquistas/page.tsx
- src/app/(platform)/liga/page.tsx
- docs/superpowers/audits/<assigned-scorecard>.md

Harness contract:
- Intent source: final delivery roadmap, pending surfaces orchestration, end-to-end audit, waves 5-10 decision packet and harness/loop research artifact
- Coordinator: current orchestration owner
- Worker lane: visual-contained-pages
- Runtime preflight: git status, branch, HEAD, dirty files, authenticated dev server if screenshots are requested
- Context pack: canonical docs plus five route files and ContainedSurfacePreview
- Allowed commands: git diff --check, npx tsc --noEmit, focused privacy tests, npm run build, authenticated screenshot capture
- Evidence outputs: receipt, desktop/mobile screenshots for all five routes and assigned scorecard
- Verification gates: containment tests, typecheck, build, visual overflow review and blocked-state copy review
- Governance gates: no Semaforo activation, no Liga activation, no legacy gamification stores, no NR-1/Yavix scope
- Stop conditions: PASS, FAIL, BLOCKED, ESCALATE, HOLD

Required checks:
- git diff --check
- npx tsc --noEmit
- npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts
- npm run build
- authenticated screenshots at 390x844 and 1440x900 for all five routes
```

### qa-independent

```text
Lane:
qa-independent

Objective:
Verify the assigned route or wave from fresh browser evidence and write a PASS/FAIL scorecard.

Write allowlist:
- docs/superpowers/audits/<assigned-scorecard>.md

Harness contract:
- Intent source: assigned lane receipt, current git diff, screenshots and canonical docs
- Coordinator: current orchestration owner
- Worker lane: qa-independent
- Runtime preflight: git status, branch, HEAD, screenshot paths, dev server/auth only if recapturing evidence
- Context pack: canonical docs, assigned files, screenshots and command output
- Allowed commands: read-only diff inspection, coordinator-assigned tests and browser/screenshot validation
- Evidence outputs: PASS/FAIL scorecard with findings and screenshot references
- Verification gates: no P0/P1/P2 unresolved, no overflow, no fixed-nav overlap, no blocked-state activation copy
- Governance gates: privacy/role/tenant checks for assigned route, no production-code edits
- Stop conditions: PASS, FAIL, BLOCKED, ESCALATE, HOLD

Required checks:
- inspect current git diff
- run the coordinator-assigned tests
- capture desktop/mobile screenshots if visual
- verify no horizontal overflow or fixed-nav overlap
- verify blocked/contained states do not imply production activation
```
