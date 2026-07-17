# UniHER Wave 1.1 Corrective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four bounded Wave 1.1 defects and publish an evidence-backed local PASS/FAIL scorecard without starting Wave 1.2.

**Architecture:** Keep the existing route, UI, mail, and Playwright architecture. Apply three isolated production corrections—sparse preference validation, literal-copy integrity, and the intentional Admin snapshot alignment—then freeze one reviewed code commit and run every promotion gate before changing documentation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Zod 4, better-sqlite3, Vitest 4, Testing Library, Playwright 1.58, PowerShell, Git.

---

## Safety contract

- Work only in `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave1-1-corrective` on `codex/uniher-wave1-1-corrective`.
- Never modify, format, stage, stash, revert, commit, or use as evidence `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-platform-wave1\tests\unit\privacy\dsar-export-cooldown.test.ts`.
- Before and after every task, require its SHA-256 to remain `CFCEFB26E378816C833DF1F4BB936FD095539751BB4229C24928B85FD61EDF54`.
- Implementers run sequentially and own only the explicit write set in their task. Every task uses RED, verified RED, minimal GREEN, verified GREEN, self-review, explicit staging, and one scoped local commit.
- After each implementation commit: fresh spec review first; only after approval, fresh code-quality review; then supervisor focused verification. Any finding returns to the same implementer and requires re-review.
- Never use `git add -A` or `git add -u`. No push, merge, deploy, PR, dependency remediation, or Wave 1.2 work.

## File map and ownership

| Task | Responsibility | Exclusive write set |
| --- | --- | --- |
| 1 | Sparse authenticated preference patches and first-access regression | `src/app/api/users/me/preferences/route.ts`, `tests/unit/privacy/user-preferences-route.test.ts`, `tests/e2e/wave-1-1-privacy.spec.ts` |
| 2 | Authenticated JSX, public metadata, and email-copy integrity | Seven authenticated JSX files named below, `src/app/layout.tsx`, `src/lib/mail/templates.ts`, `tests/unit/platform/authenticated-jsx-copy.test.ts`, `tests/unit/platform/dashboard-charts.test.tsx`, `tests/e2e/rh.spec.ts`, `tests/unit/privacy/home-gamification-reachability.test.ts` |
| 3 | Intentional Admin visual baseline alignment | `tests/e2e/platform-foundation.spec.ts`, desktop snapshot; mobile snapshot only if a separately explained current-render delta exists |
| 4 | Final evidence and promotion decision | `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`, `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md` only |

### Task 1: Sparse preferences and first-access persistence

**Files:**
- Modify: `src/app/api/users/me/preferences/route.ts`
- Create: `tests/unit/privacy/user-preferences-route.test.ts`
- Modify: `tests/e2e/wave-1-1-privacy.spec.ts`

- [ ] **Step 1: Write the focused route tests in RED**

Create a Vitest suite that mocks `withAuth` as a direct handler, supplies an authenticated `userId`, initializes an in-memory better-sqlite3 `user_preferences` table with the same unique `(user_id, pref_key)` contract, and mocks `getReadDb`, `getWriteQueue`, and `initDb`. Count `enqueue` calls and execute the callback against the in-memory database.

Cover these exact calls to `PATCH(new Request(...), { auth })`:

```ts
{ preferences: { notif_email: '1' } }                    // 200; only notif_email persists
{ preferences: {} }                                      // 200 { success: true }; enqueue count unchanged
{ preferences: { unknown_key: '1' } }                    // 400; no write
{ preferences: { notif_email: 1 } }                      // 400; no write
{ preferences: { privacy_ranking: '1' } }                // 410 typed privacy-review response; no write
{ preferences: { notif_email: '1', privacy_ranking: '1' } } // 410; neither key persists
```

Assert database rows, status, response body, and queue count after every call. Use a unique authenticated user and reset the table/counter in `beforeEach`.

- [ ] **Step 2: Verify RED is caused by Zod 4 exhaustive record validation**

Run:

```powershell
npx vitest run tests/unit/privacy/user-preferences-route.test.ts
```

Expected: the one-key success case fails with `400`; rejection and atomicity cases already remain closed.

- [ ] **Step 3: Make the minimal route correction**

Replace only the schema constructor:

```ts
const PatchSchema = z.object({
  preferences: z.partialRecord(
    z.enum(VALID_KEYS),
    z.string()
  ),
});
```

Preserve the existing validation-before-queue order, `privacy_ranking` check before `Object.entries`, empty-object early return, transactional upsert, string-value compatibility, and response shapes.

- [ ] **Step 4: Verify route GREEN and containment neighbors**

Run:

```powershell
npx vitest run tests/unit/privacy/user-preferences-route.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 5: Add a real first-access browser regression in RED/GREEN**

In `tests/e2e/wave-1-1-privacy.spec.ts`, add a collaborator test that:

1. stores the current `first_access_tour_completed` row (including absence);
2. sets it to `'0'` before navigation;
3. authenticates and opens `/primeiro-acesso`;
4. clicks the exact accessible button name `Pular tour`;
5. waits for the final confirmation state;
6. calls `/api/auth/me` and expects `user.firstAccessTourCompleted === true`;
7. verifies the database value is `'1'`;
8. restores the original row in `finally`, deleting it when originally absent.

Run the single test before the schema correction to capture the `PATCH` failure, then after correction:

```powershell
npm run test:wave1.1 -- --grep "Pular tour"
```

Expected after GREEN: the focused browser regression passes and its fixture is restored even on assertion failure.

- [ ] **Step 6: Self-review, explicit stage, and commit**

Run `git diff --check`, inspect `git diff --` for the three allowed paths, verify the external SHA-256, then:

```powershell
git add -- 'src/app/api/users/me/preferences/route.ts' 'tests/unit/privacy/user-preferences-route.test.ts' 'tests/e2e/wave-1-1-privacy.spec.ts'
git commit -m "fix: support sparse user preference updates"
```

### Task 2: Authenticated, public, and email copy integrity

**Files:**
- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/app/(platform)/dashboard/components/EngagementOverview.tsx`
- Modify: `src/app/(platform)/dashboard/components/DepartmentOverview.tsx`
- Modify: `src/app/(platform)/dashboard/components/DashboardDetails.tsx`
- Modify: `src/app/(platform)/dashboard/components/AgeOverview.tsx`
- Modify: `src/app/(platform)/historico/page.tsx`
- Modify: `src/app/(platform)/analytics-emails/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/mail/templates.ts`
- Create: `tests/unit/platform/authenticated-jsx-copy.test.ts`
- Modify: `tests/unit/platform/dashboard-charts.test.tsx`
- Modify: `tests/e2e/rh.spec.ts`
- Modify: `tests/unit/privacy/home-gamification-reachability.test.ts`

- [ ] **Step 1: Create the AST contract and verify RED**

Use the TypeScript compiler API (`typescript`) to parse authenticated `.tsx` route sources. Walk `JsxText` nodes and `JsxAttribute` string literals only; collect values matching `/\\u[0-9a-fA-F]{4}/`. Assert an empty finding list with messages containing file, line, and literal. Do not scan JavaScript expression strings.

Run:

```powershell
npx vitest run tests/unit/platform/authenticated-jsx-copy.test.ts
```

Expected: FAIL with exactly 27 JSX nodes and 48 raw escapes across the seven named files.

- [ ] **Step 2: Repair only the confirmed JSX literals**

Replace each raw JSX escape with its native UTF-8 Portuguese character in those seven files. Do not alter expression strings, API/model values, CSV strings, error messages, tests, or emoji.

Run the AST test again. Expected: PASS with zero findings. Run a separate inventory and require zero raw escapes in JSX text/quoted attributes while retaining valid expression-string escapes:

```powershell
rg -n "\\u[0-9a-fA-F]{4}" 'src/app/(platform)/dashboard' 'src/app/(platform)/historico/page.tsx' 'src/app/(platform)/analytics-emails/page.tsx'
```

- [ ] **Step 3: Strengthen rendered-label tests and browser assertions**

In `dashboard-charts.test.tsx`, assert complete accessible Portuguese labels produced by the affected charts (including `Faixas etárias` where rendered). In `rh.spec.ts`, replace prefix regex coverage for Dashboard, History, and Communications with exact accessible names and add an assertion that each page body does not match `/\\u[0-9a-fA-F]{4}/`.

Run:

```powershell
npx vitest run tests/unit/platform/authenticated-jsx-copy.test.ts tests/unit/platform/dashboard-charts.test.tsx
npm run test:rh -- --grep "Dashboard|Histórico|Comunicações"
```

Expected: all focused unit and browser checks pass.

- [ ] **Step 4: Extend reachable-copy tests in RED**

Update `home-gamification-reachability.test.ts` so the tested surface combines:

```ts
collectReachableSources('src/app/page.tsx')
collectReachableSources('src/app/layout.tsx')
inviteEmailHtml(fixedInviteFixture)
welcomeEmailHtml(fixedWelcomeFixture)
```

Assert the rendered HTML and source graph contain none of the existing forbidden legacy terms. Keep password-reset output out of the changed behavior and add a preservation assertion for its current reset-specific copy.

Run:

```powershell
npx vitest run tests/unit/privacy/home-gamification-reachability.test.ts
```

Expected: FAIL on root metadata/JSON-LD and invite/welcome promises.

- [ ] **Step 5: Replace only stale reachable promises and verify GREEN**

In `src/app/layout.tsx`, rewrite metadata, OpenGraph/Twitter descriptions, JSON-LD description, and FAQ entries so claims are limited to educational journeys, campaigns, personal self-service, and privacy-protected aggregate management. Remove ranking, points, XP, badges, streaks, arena, dopamine, rewards, and unsupported numeric outcome claims from the reachable metadata graph.

In `src/lib/mail/templates.ts`, use this boundary for invitation and welcome prose:

```text
Acesse campanhas, conteúdos educativos e sua jornada privada na UniHER.
```

Preserve role labels, invite URL/button, password-reset template, HTML structure, and unrelated mail behavior.

Run:

```powershell
npx vitest run tests/unit/privacy/home-gamification-reachability.test.ts tests/unit/platform/authenticated-jsx-copy.test.ts tests/unit/platform/dashboard-charts.test.tsx
```

Expected: all selected tests pass.

- [ ] **Step 6: Self-review, explicit stage, and commit**

Verify only the 13 allowed paths changed, run `git diff --check`, verify the external SHA-256, then explicitly stage each path (no directory-wide staging) and commit:

```powershell
git commit -m "fix: align reachable copy with privacy containment"
```

### Task 3: Intentional Admin visual baseline alignment

**Files:**
- Modify: `tests/e2e/platform-foundation.spec.ts`
- Modify: `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png`
- Conditional modify: `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-mobile-platform-foundation-win32.png`

- [ ] **Step 1: Add semantic absence coverage**

After opening the stable Admin shell, assert no active/visible tab with exact accessible name `Badges` exists, while `Sistema`, `Alertas`, and `Auditoria` remain visible. Run the foundation project without snapshot updates and confirm the semantic check passes while desktop comparison remains the known stale 1,345-pixel failure.

```powershell
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
```

- [ ] **Step 2: Regenerate only the desktop snapshot**

Run the exact foundation screenshot test with `--update-snapshots`, then rerun it without update. Do not update mobile unless the current render independently fails and the delta is explained before staging.

```powershell
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --grep "desktop and mobile authenticated admin references remain stable" --update-snapshots
npx playwright test --config=playwright.config.ts --project=platform-foundation --grep "desktop and mobile authenticated admin references remain stable"
Pop-Location
```

- [ ] **Step 3: Inspect both images at original resolution**

Inspect desktop 1440x900 and mobile 375x812. Desktop acceptance is limited to absent `Badges 6` plus the left shift of `Sistema`, `Alertas`, and `Auditoria`; reject any change to sidebar, typography, cards, colors, content, or geometry outside the tab row. Mobile must pass independent inspection and remain unchanged unless a separately justified delta exists.

- [ ] **Step 4: Self-review, explicit stage, and commit**

Run the full foundation project again, `git diff --check`, verify the external SHA-256, then explicitly stage the spec and desktop snapshot, plus mobile only if approved by the conditional rule:

```powershell
git add -- 'tests/e2e/platform-foundation.spec.ts' 'tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png'
git commit -m "test: align admin privacy baseline"
```

### Task 4: Freeze, independently review, gate, and record Wave 1.1

**Files:**
- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`
- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md` only for a forward link

- [ ] **Step 1: Freeze and independently review candidate `C`**

Set `C = git rev-parse HEAD`. A fresh final reviewer audits `f398d535c5c30bf79f6bb1d2cee26a55217a9731..C` against the approved design, checks scope and security, confirms all per-task reviews are closed, and verifies no documentation-only commit is included in `C` after the plan commit. Any code finding creates a scoped fix commit, invalidates `C`, and repeats final review with the new SHA.

- [ ] **Step 2: Run the complete gate sequentially on `C`**

Ensure no unrelated server occupies the configured port; start/stop only the corrective worktree runtime through Playwright/configured scripts. Run, without skipping:

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
npm run test:wave1.1
npm run test:master
npm run test:seguranca
npm run test:rh
npm run test:colaboradora
npm run test:integrado
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
```

Record exit code, file/test counts, skips, warnings, and failures for every command. Any skipped or failed command forces `Decision: FAIL`.

- [ ] **Step 3: Run and classify all three static inventories**

```powershell
rg -n "api/rh/agenda|alert_preferences|user_leagues|week_points|recalculateSemaforo|health_scores|UPDATE users SET points|SUM\(points\)|pointsEarned|xp_reward|holder_count|toPublicUser|recordHealthScore|INSERT INTO health_scores" src
rg -n "Urgente|Saudável|Liga Semanal|ranking|XP|pts" 'src/app/(platform)' src/components
rg -n "scheduled|cron|report|export" src/services src/app/api src/instrumentation.ts
```

Classify every hit as unreachable quarantine, schema/history, safe non-gamification wording, or blocker. Attach response/write-test evidence for every reachable candidate. Any reachable manager Agenda payload, contaminated score writer, legacy point number, ranking output, small-cohort raw value, or suppressed export number is an automatic FAIL.

- [ ] **Step 4: Run final repository hygiene checks**

```powershell
git diff --check f398d535c5c30bf79f6bb1d2cee26a55217a9731..$C
git status --short
Get-FileHash -Algorithm SHA256 'C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-platform-wave1\tests\unit\privacy\dsar-export-cooldown.test.ts'
```

Require a clean worktree before scorecard editing and the exact protected SHA-256.

- [ ] **Step 5: Replace the partial scorecard with exact evidence**

Write `- Reviewed code commit: <C>` and `- Decision: PASS` only if every gate passed; otherwise write `FAIL` and name blockers. Include exact counts/results for all commands, Agenda self-scope plus manager/Admin negatives, migration/idempotence, ranking/points/badges/Semáforo/health-score quarantine, 9/10/complementary/temporal suppression, API/UI/CSV/cache/tenant/role/payload canaries, scheduled report/export inventory, original-resolution desktop/mobile inspection, NFT warning, and 25 dependency advisories as non-blocking out-of-scope debt.

In the historical Wave 1 scorecard, add only a forward link to the final Wave 1.1 decision; do not rewrite historical evidence.

- [ ] **Step 6: Explicitly stage documentation and commit `D`**

```powershell
git add -- 'docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md' 'docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md'
git commit -m "docs: record Wave 1.1 corrective gate"
```

Verify `C` is an ancestor of `D`, `C..D` contains documentation only, the worktree is clean, and the protected SHA-256 is unchanged. Stop locally: do not push, merge, deploy, create a PR, or begin Wave 1.2.
