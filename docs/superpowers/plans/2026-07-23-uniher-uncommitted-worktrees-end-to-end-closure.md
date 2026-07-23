# UniHER Uncommitted Worktrees End-to-End Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** close the five UniHER worktrees with uncommitted work by turning each lane into a validated commit/PR, a documented HOLD/BLOCKED decision, or an intentional cleanup package with no ambiguous WIP left behind.

**Architecture:** Use one coordinator from the root checkout and five isolated worker lanes, one per dirty worktree. Each lane runs the same loop engineering cycle: preflight, observe, plan, act, verify, reflect, coordinator gate. Harness engineering is the control plane: source of truth, write allowlist, denylist, commands, receipts, scorecards, stop conditions and final promotion decision are explicit before mutable work.

**Tech Stack:** Git worktrees, PowerShell, Next.js 16, TypeScript, Vitest, Next build, GitHub CLI, existing UniHER `docs/superpowers` audit/plan/ledger system.

---

## Active Goal

Thread goal created on 2026-07-23:

> Fechar ponta a ponta as 5 worktrees UniHER com trabalho não commitado: corrigir ou arquivar cada lane sob harness/loop, validar gates, produzir recibos, e deixar cada árvore em estado limpo ou explicitamente HOLD/BLOCKED com plano e decisão registrada.

The goal is complete only when every lane in this plan has one of these terminal states:

- `PASS-COMMITTED`: intended changes are committed locally, pushed or PR-created when requested, and the worktree has no unrelated untracked/staged drift.
- `PASS-DOCS-ONLY`: intended documentation package is committed or intentionally preserved with an explicit receipt.
- `HOLD`: not merged or committed because a product/governance decision is required; the hold reason and next action are documented.
- `BLOCKED`: implementation cannot continue because a gate fails or external contract is missing; failing command and exact failure class are documented.
- `DISCARDED`: transient artifacts were removed only after explicit operator approval.

## Source Of Truth

- Audit input: `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-plan-audit.md`
- Global ledger: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` when present in the target worktree
- Root repository: `C:/Users/user/Documents/uniher-app-audit`
- Dirty worktrees:
  - `C:/Users/user/Documents/uniher-app-audit`
  - `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix`
  - `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-platform-wave1`
  - `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education`
  - `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1`

## Global Harness Contract

**Coordinator**

- Current Codex session owns orchestration, final review, scorecard updates, publish decisions and cross-worktree conflict prevention.

**Worker lanes**

| Lane | Worktree | Current decision | Owner |
|---|---|---|---|
| L1 Root docs cleanup | `C:/Users/user/Documents/uniher-app-audit` | HOLD | coordinator or one docs worker |
| L2 Deploy package fix | `.worktrees/uniher-deploy-package-fix` | FAIL | one package worker |
| L3 DSAR test hardening | `.worktrees/uniher-platform-wave1` | PASS focused | one privacy-test worker |
| L4 Wave 2B education repair | `.worktrees/uniher-wave2b-education` | FAIL/BLOCKED | one education/privacy worker |
| L5 Wave 3 leftover split | `.worktrees/uniher-wave3-collaborator-nr1` | HOLD | one split-packaging worker |

**Global write denylist**

- No `git reset --hard`, destructive checkout, broad stash, broad cleanup, worktree removal, or untracked deletion without explicit operator approval.
- No direct merge into `main`.
- No production deploy.
- No broad `git add -A` in a mixed worktree.
- No Yavix provisioning implementation or inferred provisioning payload.
- No NR-1 scoring/result sync, Semaforo activation, Liga/ranking/reward activation, or SIPAT content invention.
- No combining CRLF-only churn with product changes.

**Global loop**

For every lane:

1. Preflight: branch, upstream, HEAD, status, staged/unstaged/untracked split.
2. Observe: read the lane's plan, scorecard and exact diff.
3. Plan: classify every file as intended, unrelated, generated evidence, transient, or blocked.
4. Act: patch only the intended lane files.
5. Verify: run the lane-specific focused gate, then broader gate if code changed.
6. Reflect: write or update a receipt with files changed and command results.
7. Coordinator gate: decide `PASS-COMMITTED`, `PASS-DOCS-ONLY`, `HOLD`, `BLOCKED`, or `DISCARDED`.

**ETCLOVG completeness check**

Every lane receipt must cover:

- Execution: exact worktree, branch and action taken.
- Tooling: commands run and versions where relevant.
- Context: source plan/spec/audit used.
- Lifecycle: preflight, observe, plan, act, verify, reflect.
- Observability: diff/stat, test counts, build output or failure text.
- Verification: focused and relevant gates.
- Governance: allowlist, denylist, stop condition, promotion decision.

## Global Preflight

### Task 0: Freeze Current Dirty-State Inventory

**Files:**

- Read: every dirty worktree listed in the source audit.
- Modify: `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md`

- [ ] **Step 1: Re-run the worktree inventory**

Run from `C:/Users/user/Documents/uniher-app-audit`:

```powershell
git worktree list --porcelain
$paths = @(
  'C:/Users/user/Documents/uniher-app-audit',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-platform-wave1',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1'
)
foreach ($path in $paths) {
  "=== $path"
  git -C $path status -sb
  git -C $path diff --stat
  git -C $path diff --cached --stat
  git -C $path ls-files --others --exclude-standard
}
```

Expected:

- The same five dirty worktrees appear.
- No new dirty worktree appears.
- If a new dirty worktree appears, stop and add it to this plan before execution.

- [ ] **Step 2: Create the closure scorecard skeleton**

Create `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md` with:

```markdown
# UniHER Uncommitted Worktrees Closure Scorecard

**Date:** 2026-07-23
**Source plan:** `docs/superpowers/plans/2026-07-23-uniher-uncommitted-worktrees-end-to-end-closure.md`
**Source audit:** `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-plan-audit.md`
**Coordinator:** current Codex session
**Decision:** IN PROGRESS

## Lane Results

| Lane | Worktree | Decision | Evidence |
|---|---|---|---|
| L1 Root docs cleanup | `C:/Users/user/Documents/uniher-app-audit` | IN PROGRESS | pending |
| L2 Deploy package fix | `.worktrees/uniher-deploy-package-fix` | IN PROGRESS | pending |
| L3 DSAR test hardening | `.worktrees/uniher-platform-wave1` | IN PROGRESS | pending |
| L4 Wave 2B education repair | `.worktrees/uniher-wave2b-education` | IN PROGRESS | pending |
| L5 Wave 3 leftover split | `.worktrees/uniher-wave3-collaborator-nr1` | IN PROGRESS | pending |

## Final Gate

- [ ] Every lane has terminal state.
- [ ] No mixed worktree was staged with unrelated files.
- [ ] No denied governance surface was activated.
- [ ] Push/PR actions happened only for approved lanes.
- [ ] Remaining HOLD/BLOCKED items have explicit owner and next action.
```

- [ ] **Step 3: Validate the scorecard skeleton**

Run:

```powershell
git diff --check -- docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md
```

Expected: exit `0`.

## L2: Deploy Package Fix

This lane is first because it is small and currently inconsistent.

### Task 1: Reconcile `@types/bcryptjs` Package State

**Files:**

- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix/package.json`
- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix/package-lock.json`

- [ ] **Step 1: Preflight staged package state**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix'
git status -sb
git diff --cached -- package.json
rg -n '"@types/bcryptjs"|"node_modules/@types/bcryptjs"|bcryptjs-2\.4\.6|bcryptjs-3\.0\.3' package.json package-lock.json
```

Expected:

- `package.json` may already be staged.
- `package-lock.json` still shows old `@types/bcryptjs` state before repair.

- [ ] **Step 2: Reconcile lockfile without changing unrelated dependencies**

Run:

```powershell
npm install --package-lock-only --save-dev @types/bcryptjs@^3.0.3
```

Expected:

- `package-lock.json` changes.
- `package.json` remains on `@types/bcryptjs: ^3.0.3`.

- [ ] **Step 3: Verify dependency graph**

Run:

```powershell
npm ls @types/bcryptjs --depth=0
rg -n '"@types/bcryptjs"|"node_modules/@types/bcryptjs"|bcryptjs-2\.4\.6|bcryptjs-3\.0\.3' package.json package-lock.json
```

Expected:

- `npm ls` exits `0`.
- `package-lock.json` no longer pins `node_modules/@types/bcryptjs` to `2.4.6`.
- If the package is deprecated or removed upstream and `npm ls` stays empty, stop and record `BLOCKED` with the npm output.

- [ ] **Step 4: Run type/build gate**

Run:

```powershell
npx tsc --noEmit
npm run build
git diff --check
```

Expected:

- `npx tsc --noEmit` exits `0`.
- `npm run build` exits `0`; known Turbopack/NFT warning is acceptable.
- `git diff --check` exits `0` or reports only pre-existing line-ending warnings without trailing whitespace failures.

- [ ] **Step 5: Commit package fix**

Run:

```powershell
git add -- package.json package-lock.json
git diff --cached --check
git commit -m "fix: align bcryptjs type dependency lockfile"
```

Expected:

- Commit succeeds.
- Worktree is clean or only contains explicitly documented unrelated drift.

- [ ] **Step 6: Update closure scorecard**

Add a row result:

```markdown
| L2 Deploy package fix | `.worktrees/uniher-deploy-package-fix` | PASS-COMMITTED | commit `<sha>`; `npx tsc --noEmit` PASS; `npm run build` PASS; lockfile reconciled |
```

## L3: DSAR Test Hardening

### Task 2: Promote DSAR Resilience Tests Safely

**Files:**

- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-platform-wave1/tests/unit/privacy/dsar-export-cooldown.test.ts`

- [ ] **Step 1: Preflight DSAR diff**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-platform-wave1'
git status -sb
git diff -- tests/unit/privacy/dsar-export-cooldown.test.ts
```

Expected:

- Only `tests/unit/privacy/dsar-export-cooldown.test.ts` is dirty.
- Diff adds DSAR keyset/iterator/WAL tests and does not modify production code.

- [ ] **Step 2: Run focused DSAR test**

Run:

```powershell
npm run test:unit -- tests/unit/privacy/dsar-export-cooldown.test.ts
```

Expected: PASS, 1 file / 8 tests.

- [ ] **Step 3: Run relevant privacy gate**

Run:

```powershell
npm run test:unit -- tests/unit/privacy/dsar-export-cooldown.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-api-containment.test.ts
npx tsc --noEmit
git diff --check
```

Expected:

- Unit command exits `0`.
- TypeScript exits `0`.
- Diff check exits `0` or reports only line-ending warnings without whitespace failures.

- [ ] **Step 4: Commit DSAR test hardening**

Run:

```powershell
git add -- tests/unit/privacy/dsar-export-cooldown.test.ts
git diff --cached --check
git commit -m "test: harden DSAR export streaming resilience"
```

Expected: commit succeeds.

- [ ] **Step 5: Update closure scorecard**

Add:

```markdown
| L3 DSAR test hardening | `.worktrees/uniher-platform-wave1` | PASS-COMMITTED | commit `<sha>`; DSAR focused PASS; privacy subset PASS; TypeScript PASS |
```

## L5: Wave 3 Leftover Split

This lane must be split before commit. The Paola PR already exists; these leftovers stay outside PR #7 unless intentionally packaged.

### Task 3: Package Admin Master Company-Profile Guard

**Files:**

- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1/src/app/(platform)/company-profile/page.tsx`
- Test: create or modify a focused unit test if a local test pattern exists for `company-profile`; otherwise create `tests/unit/platform/company-profile-admin-scope.test.tsx`

- [ ] **Step 1: Preflight leftover split**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1'
git status -sb
git diff --name-status
git diff -- 'src/app/(platform)/company-profile/page.tsx'
git diff -- 'src/app/(platform)/configuracoes/config.module.css' 'src/services/objectives.service.ts'
```

Expected:

- `company-profile/page.tsx` has real content diff.
- `config.module.css` and `objectives.service.ts` show no content diff or only line-ending noise.
- Yavix research is untracked.

- [ ] **Step 2: Add focused test for Admin Master without company**

Create `tests/unit/platform/company-profile-admin-scope.test.tsx` with:

```tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CompanyProfilePage from '@/app/(platform)/company-profile/page';

const authState = vi.hoisted(() => ({
  user: { role: 'admin', companyId: undefined as string | undefined },
  isLoading: false,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authState,
}));

describe('CompanyProfilePage Admin Master scope', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authState.user = { role: 'admin', companyId: undefined };
    authState.isLoading = false;
  });

  afterEach(() => cleanup());

  it('does not fetch company data for Admin Master without a company scope', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<CompanyProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Perfil por empresa')).toBeTruthy();
    });

    expect(fetchSpy).not.toHaveBeenCalledWith('/api/company');
    expect(screen.getByText(/conta master nao esta vinculada/i)).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run focused test**

Run:

```powershell
npm run test:unit -- tests/unit/platform/company-profile-admin-scope.test.tsx
```

Expected:

- Before implementation, this test fails by fetching `/api/company` or by not rendering the neutral Admin Master state.
- After current implementation, this test should pass. If it fails because the test harness lacks DOM setup, adapt it to the repository's existing Testing Library pattern from `tests/unit/platform/sidebar-capability.test.tsx`.

- [ ] **Step 4: Run relevant gate**

Run:

```powershell
npm run test:unit -- tests/unit/platform/company-profile-admin-scope.test.tsx tests/unit/platform/use-auth-scope.test.tsx
npx tsc --noEmit
git diff --check -- 'src/app/(platform)/company-profile/page.tsx' tests/unit/platform/company-profile-admin-scope.test.tsx
```

Expected: all commands exit `0`.

- [ ] **Step 5: Commit only company-profile guard**

Run:

```powershell
git add -- 'src/app/(platform)/company-profile/page.tsx' tests/unit/platform/company-profile-admin-scope.test.tsx
git diff --cached --name-only
git diff --cached --check
git commit -m "fix: avoid company lookup for unscoped master admin"
```

Expected:

- Cached names include only the page and focused test.
- Commit succeeds.
- Yavix research and CRLF-only files remain unstaged.

### Task 4: Package Yavix Public Provisioning Research Separately

**Files:**

- Add: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`

- [ ] **Step 1: Validate Yavix research boundary**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1'
Get-Content 'docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md' -TotalCount 80
rg -n 'SUPOSI|infer|provision|YavixProvisioningClient|api.yavix.com.br|dev-implantacao|OpenAPI|Postman|CPF|CNPJ' 'docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md'
git diff --check -- 'docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md'
```

Expected:

- The document clearly separates Yavix assessment API from provisioning.
- It does not claim a working provisioning endpoint.
- It asks for the official OpenAPI/Postman contract before implementation.

- [ ] **Step 2: Commit research doc only**

Run:

```powershell
git add -- 'docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md'
git diff --cached --name-only
git diff --cached --check
git commit -m "docs: record public Yavix provisioning discovery"
```

Expected:

- Cached names include only the Yavix research doc.
- Commit succeeds.

- [ ] **Step 3: Leave CRLF-only noise untouched**

Run:

```powershell
git diff -- 'src/app/(platform)/configuracoes/config.module.css' 'src/services/objectives.service.ts'
git status -sb
```

Expected:

- If the two files still appear dirty but `git diff` is empty, record as line-ending noise and do not stage.

- [ ] **Step 4: Update closure scorecard**

Add:

```markdown
| L5 Wave 3 leftover split | `.worktrees/uniher-wave3-collaborator-nr1` | PASS-COMMITTED/HOLD | company-profile commit `<sha>`; Yavix doc commit `<sha>`; CRLF-only files left unstaged as HOLD cleanup |
```

## L1: Root Docs Cleanup

This lane is documentation packaging. It must not commit transient runtime logs/PID files by accident.

### Task 5: Decide And Package Root Documentation

**Files:**

- Add or preserve: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/audits/2026-07-20-uniher-platform-redesign-readiness.md`
- Add or preserve: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/plans/2026-07-20-uniher-collaborator-placeholder-repair.md`
- Add or preserve: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/plans/2026-07-20-uniher-company-community-feed.md`
- Add or preserve: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/plans/2026-07-20-uniher-mobile-shell-findings-correction.md`
- Add or preserve: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md`
- Exclude by default: `C:/Users/user/Documents/uniher-app-audit/.superpowers/**/state/*.pid`
- Exclude by default: `C:/Users/user/Documents/uniher-app-audit/.superpowers/**/state/*.log`
- Exclude by default: `C:/Users/user/Documents/uniher-app-audit/.superpowers/**/state/server.err`

- [ ] **Step 1: Inventory root untracked docs and transient files**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit'
git status -sb
git ls-files --others --exclude-standard docs/superpowers .superpowers
```

Expected:

- Markdown docs listed above appear.
- `.superpowers/brainstorm/**/content/*.html` may appear.
- `.superpowers/brainstorm/**/state/*` appears as transient runtime state.

- [ ] **Step 2: Stage documentation Markdown only**

Run:

```powershell
git add -- `
  docs/superpowers/audits/2026-07-20-uniher-platform-redesign-readiness.md `
  docs/superpowers/audits/2026-07-23-uncommitted-worktrees-plan-audit.md `
  docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md `
  docs/superpowers/plans/2026-07-20-uniher-collaborator-placeholder-repair.md `
  docs/superpowers/plans/2026-07-20-uniher-company-community-feed.md `
  docs/superpowers/plans/2026-07-20-uniher-mobile-shell-findings-correction.md `
  docs/superpowers/plans/2026-07-23-uniher-uncommitted-worktrees-end-to-end-closure.md `
  docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md
git diff --cached --name-only
```

Expected:

- Cached paths are Markdown docs only.
- No `.superpowers/**/state/*` file is cached.

- [ ] **Step 3: Validate root docs**

Run:

```powershell
git diff --cached --check
$markers = @(
  ([string][char[]](84,66,68)),
  ('TO' + 'DO'),
  ('implement ' + 'later'),
  ('fill in ' + 'details'),
  ('Similar to ' + 'Task'),
  ('appropriate error ' + 'handling'),
  ('add ' + 'validation'),
  ('Write tests for ' + 'the above')
)
$pattern = ($markers | ForEach-Object { [regex]::Escape($_) }) -join '|'
rg -n $pattern docs/superpowers/audits docs/superpowers/plans docs/superpowers/specs
```

Expected:

- `git diff --cached --check` exits `0`.
- Placeholder scan has no matches in the staged closure plan. Older historical plans may contain unchecked boxes; that is acceptable if they are historical plan files, but unresolved placeholder marker text in the new closure files is not acceptable.

- [ ] **Step 4: Commit root docs package**

Run:

```powershell
git commit -m "docs: audit and plan UniHER worktree closure"
```

Expected: commit succeeds.

- [ ] **Step 5: Push root branch if operator wants publication**

Run only if the operator confirms publication:

```powershell
git push -u origin codex/security-lessons-review
```

Expected: branch pushes. If not confirmed, leave as local `PASS-DOCS-ONLY`.

- [ ] **Step 6: Update closure scorecard**

Add:

```markdown
| L1 Root docs cleanup | `C:/Users/user/Documents/uniher-app-audit` | PASS-DOCS-ONLY | docs committed `<sha>`; transient `.superpowers` state excluded |
```

## L4: Wave 2B Education Repair

This lane is last because it has real failing tests and touches campaign/lesson/gamification boundaries.

### Task 6: Close Campaign Boundary And Legacy Lesson Quarantine

**Files:**

- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/app/api/campaigns/route.ts`
- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/app/api/campaigns/[id]/route.ts`
- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/app/api/campaigns/join/route.ts`
- Modify: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/repositories/campaign.repository.ts`
- Add: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/app/api/campaigns/[id]/assignment/route.ts`
- Add: `C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education/src/lib/db/migrations/054_wave2b_education_schema.sql`
- Modify or add quarantine adapters for:
  - `src/app/api/rh/lessons/route.ts`
  - `src/app/api/rh/lessons/[id]/route.ts`
  - `src/app/api/gamification/daily-lesson/route.ts`
- Test: `tests/unit/education/campaign-boundary.test.ts`
- Test: `tests/unit/security/wave-2b-education-boundary.test.ts`

- [ ] **Step 1: Reproduce current failing gate**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education'
npm run test:unit -- tests/unit/education/campaign-boundary.test.ts tests/unit/security/wave-2b-education-boundary.test.ts
```

Expected before repair:

- `tests/unit/education/campaign-boundary.test.ts` passes.
- `tests/unit/security/wave-2b-education-boundary.test.ts` fails on 5 tests covering legacy lesson/gamification quarantine.

- [ ] **Step 2: Add explicit quarantine response helper**

Create `src/lib/education/quarantine.ts`:

```ts
import { NextResponse } from 'next/server';

export const LEGACY_LESSON_QUARANTINE_RESPONSE = {
  error: 'LEGACY_LESSON_QUARANTINED',
  educationPath: '/api/education/lessons',
} as const;

export const LEGACY_GAMIFICATION_COMPLETION_QUARANTINE_RESPONSE = {
  error: 'LEGACY_GAMIFICATION_COMPLETION_QUARANTINED',
  educationPath: '/api/education/lessons/[id]/completion',
} as const;

export function legacyLessonQuarantined(): NextResponse {
  return NextResponse.json(LEGACY_LESSON_QUARANTINE_RESPONSE, { status: 410 });
}

export function legacyGamificationCompletionQuarantined(): NextResponse {
  return NextResponse.json(LEGACY_GAMIFICATION_COMPLETION_QUARANTINE_RESPONSE, { status: 410 });
}
```

- [ ] **Step 3: Fail closed RH legacy lesson writes**

In `src/app/api/rh/lessons/route.ts`, preserve `GET` only if the product decision is to allow side-effect-free legacy reads. Replace `POST` export with:

```ts
import { legacyLessonQuarantined } from '@/lib/education/quarantine';

export const POST = withRole('rh')(async () => legacyLessonQuarantined());
```

In `src/app/api/rh/lessons/[id]/route.ts`, replace write exports with:

```ts
import { legacyLessonQuarantined } from '@/lib/education/quarantine';

export const PATCH = withRole('rh')(async () => legacyLessonQuarantined());
export const DELETE = withRole('rh')(async () => legacyLessonQuarantined());
```

Expected:

- `POST`, `PATCH`, and `DELETE` no longer mutate `daily_lessons`.
- If these files already have imports named `withRole`, keep the existing import and add only the quarantine import.

- [ ] **Step 4: Remove side effects from legacy lesson GET**

Run:

```powershell
rg -n "INSERT INTO daily_lessons|ensure|seed|reflection|Reflexao|daily_lessons" src/app/api/rh/lessons src/services src/repositories
```

Patch the reachable code path used by `GET /api/rh/lessons` so a read does not seed weekly reflection rows. If the seeding is in the route, guard it behind a migration/seed command rather than request handling. The runtime invariant is:

```ts
// GET /api/rh/lessons must only read existing rows.
// It must not INSERT, UPDATE or DELETE daily_lessons.
```

Expected:

- The `keeps the legacy lesson GET side-effect free` test no longer shows new reflection rows in `daily_lessons`.

- [ ] **Step 5: Quarantine legacy gamification lesson completion**

In `src/app/api/gamification/daily-lesson/route.ts`, replace the write path used by POST with:

```ts
import { legacyGamificationCompletionQuarantined } from '@/lib/education/quarantine';

export const POST = withAuth(async () => legacyGamificationCompletionQuarantined());
```

Expected:

- The endpoint returns `410`.
- It does not write `user_lesson_progress`.
- It does not return `score`, `progressRecorded`, `success`, points, rank, level, badge or reward fields.

- [ ] **Step 6: Run focused Wave 2B gate**

Run:

```powershell
npm run test:unit -- tests/unit/education/campaign-boundary.test.ts tests/unit/security/wave-2b-education-boundary.test.ts
```

Expected: PASS, 2 files / 22 tests.

- [ ] **Step 7: Run relevant privacy regression**

Run:

```powershell
npm run test:unit -- tests/unit/security/wave-2b-education-boundary.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts
npx tsc --noEmit
git diff --check
```

Expected:

- Unit command exits `0`.
- TypeScript exits `0`.
- Diff check exits `0` or line-ending warnings only.

- [ ] **Step 8: Write Wave 2B scorecard**

Create `docs/superpowers/audits/2026-07-23-uniher-wave2b-education-boundary-scorecard.md` with:

```markdown
# UniHER Wave 2B Education Boundary Scorecard

**Date:** 2026-07-23
**Lane:** Wave 2B Campaigns/Education boundary
**Decision:** PASS

## What Changed

- Campaign list/join/update/delete is company-scoped.
- Orphan campaigns are quarantined until Admin Master assigns them.
- Campaign withdrawal preserves membership history and writes audit evidence.
- Legacy lesson writes return `410 LEGACY_LESSON_QUARANTINED`.
- Legacy gamification daily-lesson completion returns `410 LEGACY_GAMIFICATION_COMPLETION_QUARANTINED`.

## Verification

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/education/campaign-boundary.test.ts tests/unit/security/wave-2b-education-boundary.test.ts` | PASS; 2 files / 22 tests |
| `npm run test:unit -- tests/unit/security/wave-2b-education-boundary.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts` | PASS |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |

## Boundaries

- No points, ranking, badges, rewards, Semaforo, health score or NR-1 result behavior activated.
- No invented education content was added.
- Legacy lesson/gamification write paths are blocked until a new education domain contract exists.
```

- [ ] **Step 9: Commit Wave 2B repair**

Run:

```powershell
git add -- `
  src/app/api/campaigns/route.ts `
  'src/app/api/campaigns/[id]/route.ts' `
  src/app/api/campaigns/join/route.ts `
  'src/app/api/campaigns/[id]/assignment/route.ts' `
  src/app/api/rh/lessons/route.ts `
  'src/app/api/rh/lessons/[id]/route.ts' `
  src/app/api/gamification/daily-lesson/route.ts `
  src/lib/db/migrations/054_wave2b_education_schema.sql `
  src/lib/education/quarantine.ts `
  src/repositories/campaign.repository.ts `
  tests/unit/education/campaign-boundary.test.ts `
  tests/unit/security/wave-2b-education-boundary.test.ts `
  docs/superpowers/audits/2026-07-23-uniher-wave2b-education-boundary-scorecard.md
git diff --cached --check
git commit -m "fix: contain Wave 2B education boundaries"
```

Expected:

- Commit succeeds only after all focused gates are green.

- [ ] **Step 10: Update closure scorecard**

Add:

```markdown
| L4 Wave 2B education repair | `.worktrees/uniher-wave2b-education` | PASS-COMMITTED | commit `<sha>`; focused Wave 2B PASS; privacy regression PASS; TypeScript PASS |
```

## Final Coordinator Gate

### Task 7: Close The End-To-End Goal

**Files:**

- Modify: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md`
- Modify: `C:/Users/user/Documents/uniher-app-audit/docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` if present and already used for these lanes

- [ ] **Step 1: Re-run all status checks**

Run:

```powershell
$paths = @(
  'C:/Users/user/Documents/uniher-app-audit',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-deploy-package-fix',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-platform-wave1',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave2b-education',
  'C:/Users/user/Documents/uniher-app-audit/.worktrees/uniher-wave3-collaborator-nr1'
)
foreach ($path in $paths) {
  "=== $path"
  git -C $path status -sb
  git -C $path log --oneline -3
}
```

Expected:

- Every lane is clean or has an explicit HOLD/BLOCKED residual listed in the scorecard.
- No staged unrelated files remain.

- [ ] **Step 2: Update final scorecard decision**

If every lane is terminal, set:

```markdown
**Decision:** PASS
```

If any lane remains red with no terminal decision, set:

```markdown
**Decision:** BLOCKED
```

and list the exact lane and command.

- [ ] **Step 3: Record final ledger row**

Append to `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` if this file is present in the root checkout:

```markdown
| 2026-07-23 | Closed uncommitted-worktree cleanup plan: five dirty UniHER worktrees were resolved into committed packages or explicit HOLD/BLOCKED decisions under harness/loop governance. | `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md`, lane commits, focused test/build gates | active |
```

- [ ] **Step 4: Final verification of root docs**

Run:

```powershell
Set-Location 'C:/Users/user/Documents/uniher-app-audit'
git diff --check
$markers = @(
  ([string][char[]](84,66,68)),
  ('TO' + 'DO'),
  ('implement ' + 'later'),
  ('fill in ' + 'details'),
  ('Similar to ' + 'Task'),
  ('appropriate error ' + 'handling'),
  ('add ' + 'validation'),
  ('Write tests for ' + 'the above')
)
$pattern = ($markers | ForEach-Object { [regex]::Escape($_) }) -join '|'
rg -n $pattern docs/superpowers/plans/2026-07-23-uniher-uncommitted-worktrees-end-to-end-closure.md docs/superpowers/audits/2026-07-23-uncommitted-worktrees-closure-scorecard.md
```

Expected:

- Diff check exits `0`.
- Placeholder scan has no matches.

- [ ] **Step 5: Mark the thread goal complete only after terminal evidence**

The coordinator may mark the active goal complete only when:

- L1 is `PASS-DOCS-ONLY`, `PASS-COMMITTED`, or `HOLD` with explicit decision.
- L2 is `PASS-COMMITTED` or `BLOCKED` with npm/lockfile output.
- L3 is `PASS-COMMITTED`.
- L4 is `PASS-COMMITTED` or `BLOCKED` with failing test class documented.
- L5 has company-profile and Yavix research split, or an explicit `HOLD` decision from the operator.

## Self-Review

**Spec coverage**

- The plan covers all five dirty worktrees from the source audit.
- Harness engineering is explicit through source of truth, coordinator, lanes, allowlists, denylists, gates, receipts and stop conditions.
- Loop engineering is explicit through preflight, observe, plan, act, verify, reflect and coordinator gate per lane.
- The global goal has terminal conditions for every lane.
- Yavix/NR-1 boundaries are preserved.

**Placeholder scan**

- This plan contains no unresolved placeholder markers.
- Historical plans referenced by this plan may contain unchecked boxes because they are source documents, not this execution contract.

**Type and command consistency**

- Every path is absolute or relative to the named worktree.
- Every command includes the intended worktree context.
- Commit steps use explicit path allowlists.
- No step uses broad `git add -A`, reset, stash, deploy or merge.

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-07-23-uniher-uncommitted-worktrees-end-to-end-closure.md`.

1. **Subagent-Driven (recommended)** - Dispatch one fresh worker per lane, coordinator reviews receipts and performs final gate.
2. **Inline Execution** - Execute lanes serially in this session using checkpoints after L2, L3/L5, L1 and L4.

Recommended execution order: L2, L3, L5, L1, L4.
