# UniHER Safe Parity Recovery Goal Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for parallel read-only parity lanes, then superpowers:executing-plans for approved implementation tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify what was created in the recovered UniHER platform with what existed in the old baseline, prioritizing safe semantic parity over rollback.

**Architecture:** `9ca4bd8d9d60c25a0b116d8ded0009cff831a551` is the old behavior baseline. `origin/main` at `ddcb7f41952a3febac127734544b3f74387585d9` is the integrated current tree. Differences are classified before code changes, and any conflict with privacy, LGPD, auth hardening, NR-1/Yavix, ranking, or sensitive modules must be rebuilt safely rather than restored literally.

**Tech Stack:** Next.js App Router, TypeScript, SQLite/better-sqlite3, Vitest, Playwright, Git/GitHub, existing `docs/superpowers` audit and plan system.

---

## Non-Negotiable Guardrails

- Do not roll back `origin/main` to the old baseline.
- Do not copy old behavior literally when it conflicts with privacy, LGPD, tenant isolation, auth hardening, or sensitive module gates.
- Do not deploy or claim production readiness inside this goal.
- Do not activate NR-1/Yavix, SIPAT, Concierge, Denuncias, Desenvolvimento Humano, Liga/ranking/rewards, or clinical Semaforo as operational modules unless their own contract/governance gate exists.
- Do not treat visual smoke as human visual approval.
- Do not patch a perceived regression until a parity test, route receipt, or written matrix row proves the expected behavior.
- Keep public/landing/email paths out of scope unless a parity finding proves they are part of the authenticated-platform flow.
- The current public/online landing is frozen by user instruction. Do not edit, deploy, promote, or use landing copy cleanup as a Wave B gate without a new explicit approval.

## Source Files And Artifacts

- Baseline audit map: `docs/superpowers/audits/2026-07-29-uniher-full-gap-map-after-main-merge.md`
- Existing recovery map: `docs/superpowers/plans/2026-07-29-uniher-wave3-merge-recovery-map.md`
- Claude review receipt: `docs/superpowers/audits/2026-07-29-claude-wave3-merge-review.md`
- New parity matrix to create: `docs/superpowers/audits/2026-07-29-uniher-safe-parity-matrix.md`
- New implementation ledger to create after matrix: `docs/superpowers/plans/2026-07-29-uniher-safe-parity-implementation-ledger.md`

## Decision Labels

Every old-vs-current behavior gets exactly one label:

- `OK_CURRENT`: current behavior preserves or improves old behavior safely.
- `REGRESSION`: current behavior broke old useful behavior without a safety reason.
- `REBUILD_SAFE`: old behavior is useful, but must be rebuilt under privacy/security constraints.
- `HOLD_EXTERNAL`: blocked by Yavix, legal, clinical, partner, production, or human approval.
- `REMOVE_PROMISE`: old or current material promises something that should not be sold or displayed.
- `UNKNOWN_NEEDS_EVIDENCE`: insufficient evidence; no code change allowed.

## Task 0: Goal Preflight And Drift Lock

**Files:**
- Read: `docs/superpowers/audits/2026-07-29-uniher-full-gap-map-after-main-merge.md`
- Read: `docs/superpowers/plans/2026-07-29-uniher-wave3-merge-recovery-map.md`
- Read: `docs/superpowers/audits/2026-07-29-claude-wave3-merge-review.md`
- Create: `docs/superpowers/audits/2026-07-29-uniher-safe-parity-matrix.md`

- [ ] **Step 0.1: Verify git baseline**

Run:

```powershell
git status --short --branch
git rev-parse --verify 9ca4bd8d9d60c25a0b116d8ded0009cff831a551
git rev-parse --verify origin/main
git diff --quiet HEAD origin/main; if ($LASTEXITCODE -eq 0) { 'TREE_DIFF_HEAD_ORIGIN_MAIN=NONE' } else { 'TREE_DIFF_HEAD_ORIGIN_MAIN=HAS_DIFF' }
```

Expected:

```text
origin/main resolves to ddcb7f41952a3febac127734544b3f74387585d9 or a newer explicitly accepted main.
No unreviewed source-code edits are present.
If tree diff exists, stop and re-audit before continuing.
```

- [ ] **Step 0.2: Start the parity matrix**

Create `docs/superpowers/audits/2026-07-29-uniher-safe-parity-matrix.md` with this header:

```markdown
# UniHER Safe Parity Matrix

Date: 2026-07-29
Baseline: `9ca4bd8d9d60c25a0b116d8ded0009cff831a551`
Current: `origin/main`
Decision mode: safe parity, not rollback

## Guardrails

- Restore behavior only when it is safe.
- Rebuild equivalent behavior when old behavior conflicts with privacy, tenant isolation, auth hardening, or sensitive module gates.
- Keep production, NR-1/Yavix real, Liga/ranking/rewards, SIPAT, Concierge, Denuncias, and clinical Semaforo in HOLD unless separately approved.

## Matrix

| Journey | Old behavior | Current behavior | Evidence old | Evidence current | Decision | Required action | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 0.3: Commit gate**

Do not commit yet. The matrix starts uncommitted until all lanes populate it and the coordinator reviews labels.

## Task 1: Auth And First Access Parity

**Files:**
- Compare: `src/app/auth/page.tsx`
- Compare: `src/app/(platform)/primeiro-acesso/page.tsx`
- Compare: `src/app/api/auth/login/route.ts`
- Compare: `src/app/api/auth/refresh/route.ts`
- Compare: `src/app/api/auth/logout/route.ts`
- Compare: `src/app/api/auth/confirm-first-access/route.ts`
- Test targets: existing auth/session tests plus any new parity tests under `tests/unit`

- [ ] **Step 1.1: Extract old behavior**

Run:

```powershell
git show 9ca4bd8d9d60c25a0b116d8ded0009cff831a551:src/app/auth/page.tsx
git show 9ca4bd8d9d60c25a0b116d8ded0009cff831a551:src/app/'(platform)'/primeiro-acesso/page.tsx
git grep -n "first_access_tour_completed\|confirm-first-access\|refresh\|must_change_password" 9ca4bd8d9d60c25a0b116d8ded0009cff831a551 -- src/app src/lib src/services tests
```

Record in the matrix:

```markdown
| Auth and first access | Old redirect/tour/password behavior from baseline | Current redirect/tour/session behavior | git show/git grep receipts | current file/test receipts | OK_CURRENT, REGRESSION, or REBUILD_SAFE | test or patch name | auth parity tests |
```

- [ ] **Step 1.2: Prove current behavior**

Run targeted current searches:

```powershell
rg -n "getAuthRedirectTarget|first_access|firstAccess|confirm-first-access|must_change_password|refresh" src/app src/lib src/services tests
```

If behavior differs, classify:

```text
REGRESSION only if old useful behavior is absent and no safety reason exists.
REBUILD_SAFE if old behavior was useful but current hardening intentionally changed the contract.
OK_CURRENT if current behavior is equivalent or safer.
```

- [ ] **Step 1.3: Define tests before patch**

If a row is `REGRESSION` or `REBUILD_SAFE`, add the exact test file and expected failing assertion to the matrix before any code edit.

## Task 2: Invite, Approval, RH User And Tenant Parity

**Files:**
- Compare: `src/app/invite/[token]/page.tsx`
- Compare: `src/app/api/invites/*`
- Compare: `src/app/api/rh/users/*`
- Compare: `src/app/(platform)/convites/page.tsx`
- Compare: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Test targets: `tests/unit/tenant-api-hardening.test.ts`, invite/RH API tests if present

- [ ] **Step 2.1: Extract old invite/RH behavior**

Run:

```powershell
git grep -n "invite\|approve\|department_id\|company_id\|role.*lideranca\|approved\|blocked" 9ca4bd8d9d60c25a0b116d8ded0009cff831a551 -- src/app src/lib src/services tests
rg -n "invite|approve|department_id|company_id|lideranca|approved|blocked" src/app/api/invites src/app/api/rh src/app/'(platform)'/convites src/app/'(platform)'/colaboradoras-gestao tests
```

- [ ] **Step 2.2: Label tenant-sensitive changes**

Use this rule:

```text
If old behavior allowed broader cross-company or cross-department access, label REBUILD_SAFE or OK_CURRENT, never REGRESSION.
If current behavior blocks a same-company/same-role legitimate flow, label REGRESSION.
```

- [ ] **Step 2.3: Define tests before patch**

For each `REGRESSION`, define a negative and positive test pair:

```text
Positive: authorized RH/Admin/Lideranca can perform the old legitimate action.
Negative: cross-tenant or wrong-role actor cannot perform it.
```

## Task 3: Dashboard And Role Surface Parity

**Files:**
- Compare: `src/app/(platform)/dashboard/page.tsx`
- Compare: `src/app/(platform)/dashboard/dashboard-view-model.ts`
- Compare: `src/app/(platform)/dashboard/dashboard-section.ts`
- Compare: `src/services/dashboard.service.ts`
- Compare: `src/app/api/dashboard/route.ts`
- Visual evidence: `docs/superpowers/evidence/visual-ux-smoke-latest/*`

- [ ] **Step 3.1: Compare dashboard claims**

Run:

```powershell
git grep -n "dashboard\|section\|saude\|exames\|lideranca\|aggregate\|export" 9ca4bd8d9d60c25a0b116d8ded0009cff831a551 -- src/app src/services tests
rg -n "dashboard|section|saude|exames|lideranca|aggregate|export|ProtectedMetric" src/app/'(platform)'/dashboard src/services src/app/api/dashboard tests
```

- [ ] **Step 3.2: Protect privacy constraints**

Use this rule:

```text
Old individual health, mood, or score exposure must not be restored.
Equivalent aggregate/protected metrics can satisfy parity only if suppression and role scope are tested.
```

- [ ] **Step 3.3: Define dashboard parity checks**

Matrix rows must distinguish:

```text
Admin/RH aggregate dashboard
Lideranca department-scoped dashboard
Compatibility routes or section aliases
CSV/export behavior
Empty/protected metric states
```

## Task 4: Colaboradora Journey Parity

**Files:**
- Compare: `src/app/(platform)/colaboradora/page.tsx`
- Compare: `src/app/(platform)/agenda/page.tsx`
- Compare: `src/app/(platform)/semaforo/page.tsx`
- Compare: `src/app/(platform)/comunidade/page.tsx`
- Compare: `src/app/(platform)/campanhas/page.tsx`
- Compare: `src/app/(platform)/objetivos/page.tsx`
- Compare: `src/app/(platform)/desafios/page.tsx`
- Compare: `src/app/(platform)/conquistas/page.tsx`
- Compare: `src/app/api/collaborator/*`

- [ ] **Step 4.1: Extract old collaborator promise**

Run:

```powershell
git grep -n "colaboradora\|agenda\|semaforo\|campanha\|objetivo\|desafio\|conquista\|badge\|liga\|ranking\|streak\|XP" 9ca4bd8d9d60c25a0b116d8ded0009cff831a551 -- src tests docs
rg -n "colaboradora|agenda|semaforo|campanha|objetivo|desafio|conquista|badge|liga|ranking|streak|XP|privacyReviewResponse" src tests docs/superpowers/audits
```

- [ ] **Step 4.2: Split safe and unsafe parity**

Use this rule:

```text
Agenda, private wellbeing, personal Semaforo, community, campaigns, private objectives, private challenges, and private achievements can be parity candidates.
Public ranking, shared badges, XP competition, rewards, and leagues are REBUILD_SAFE or HOLD_EXTERNAL unless product/legal explicitly approves.
```

- [ ] **Step 4.3: Define collaborator journey smoke**

Before implementation, define a route/test receipt covering:

```text
Colaboradora login -> home -> agenda CRUD -> wellbeing status -> personal Semaforo -> community feed -> campaign join -> objective/challenge/conquista state.
```

## Task 5: Product Gap And Sensitive Module Decision Sheet

**Files:**
- Create: `docs/superpowers/audits/2026-07-29-uniher-product-gap-decision-sheet.md`
- Reference: `src/components/platform/navigation.ts`
- Reference: `tests/unit/module-shells.test.ts`
- Reference: `src/app/(platform)/nr1/page.tsx`
- Reference: `src/app/(platform)/avaliacao-nr1/page.tsx`

- [ ] **Step 5.1: Create the decision sheet**

Create this table:

```markdown
# UniHER Product Gap Decision Sheet

Date: 2026-07-29
Purpose: decide whether missing old/current promises are rebuilt safely, held, or removed.

| Module | Current state | Old/current promise | Decision | Required source/contract | Data model needed | Tests needed | Commercial wording |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Liga/ranking/rewards | shell/410/privacy review | classic gamification | REBUILD_SAFE or REMOVE_PROMISE | ranking policy/legal approval | opt-in, suppression, audit | privacy and anti-leak tests | do not sell as ready |
| SIPAT | shell | operational SIPAT | HOLD_EXTERNAL | content owner/program approval | schedule/content/progress | module e2e | gated module |
| Concierge | shell | service desk | HOLD_EXTERNAL | partner/SLA/process | requests/status/audit | API and workflow tests | gated module |
| Denuncias | shell | reporting channel | HOLD_EXTERNAL | legal/partner/anonymity policy | case model/retention | security/privacy tests | gated module |
| Desenvolvimento Humano/Educacao | partial | content CMS | REBUILD_SAFE | content governance | content catalog/progress | editorial tests | partial community content only |
| NR-1/Yavix | mock/fail-closed | real COPSOQ/scoring/laudo | HOLD_EXTERNAL | official Yavix API/auth/results/LGPD | provisioning/results/outbox | contract tests | not operational |
```

- [ ] **Step 5.2: Stop condition**

If a module lacks source/contract/owner, do not create implementation tasks for it. Keep it in HOLD or REMOVE_PROMISE.

## Task 6: P1 Safety Interlock

**Files:**
- Review: `src/lib/upload/index.ts`
- Review: `src/lib/employee-import/repository.ts`
- Review: `src/lib/privacy/dsar-export.ts`
- Review: `src/app/api/rh/users/[id]/route.ts`
- Review: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 6.1: Link P1s to parity work**

If any parity task touches uploads, employee import/identity, DSAR, or reset-password, complete the corresponding P1 fix first in the same branch.

- [ ] **Step 6.2: Required P1 tests**

Before P1 implementation, define failing tests for:

```text
SVG upload rejection or safe sanitization.
Imported employee identity appears in DSAR after account linkage or safe subject resolution.
Password reset endpoint does not return a temporary password in JSON.
```

## Task 7: Implementation Ledger And Promotion Gate

**Files:**
- Create: `docs/superpowers/plans/2026-07-29-uniher-safe-parity-implementation-ledger.md`

- [ ] **Step 7.1: Create implementation ledger**

Create:

```markdown
# UniHER Safe Parity Implementation Ledger

Date: 2026-07-29
Goal: track approved parity fixes only.

| Item | Matrix decision | Branch/commit | Files changed | Tests | Claude/review | Promotion decision |
| --- | --- | --- | --- | --- | --- | --- |
```

- [ ] **Step 7.2: Promotion rules**

Use:

```text
PASS: tests prove safe parity and no P1 remains in touched area.
HOLD: behavior is useful but blocked by privacy, legal, Yavix, production, or human approval.
FAIL: test proves regression remains or patch broadens scope.
ESCALATE: product decision is required before code can proceed.
```

## Execution Order

1. Task 0: drift lock and matrix creation.
2. Tasks 1-4: fill parity matrix read-only, preferably with parallel agents.
3. Task 5: product gap decision sheet.
4. Task 6: P1 interlock for touched areas.
5. Task 7: implementation ledger.
6. Only then create code-fix tasks from matrix rows labelled `REGRESSION` or `REBUILD_SAFE`.

## Immediate Next Step

Start Task 0 and fill the first matrix rows for Auth/First Access. Stop before code edits unless the matrix shows a concrete regression and the user approves implementation.
