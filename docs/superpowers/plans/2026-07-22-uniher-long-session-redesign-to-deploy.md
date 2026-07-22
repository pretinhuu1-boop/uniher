# UniHER Long Session Redesign To Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the authenticated internal UniHER redesign, close every remaining promotable page wave with evidence, review and package the diff safely, push to GitHub, and deploy to the VPS only after real gates pass.

**Architecture:** Use one coordinator loop for the whole overnight session. Each page wave gets a bounded harness: preflight, observe, plan, act, verify, reflect, scorecard and explicit staging allowlist. Semaforo and Liga remain policy/clinical gated unless their current scope is visual-only; no RH/Yavix/NR-1 scope is changed here.

**Tech Stack:** Next.js 16, TypeScript, SQLite/better-sqlite3, Vitest, Playwright/Chromium, GitHub CLI, VPS deploy via `deploy/vps/deploy.sh`, PM2 and Nginx.

---

## Current Baseline

- Checkout: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Branch: `codex/uniher-wave3-collaborator-nr1`
- HEAD before this plan: `dbd44c0`
- Remote: `origin https://github.com/pretinhuu1-boop/uniher.git`
- GitHub auth: `gh auth status` passed for `pretinhuu1-boop`.
- Deploy docs: `docs/OPERACAO_VPS.md`, `deploy/vps/deploy.sh`, `ecosystem.config.cjs`.
- Deploy target from docs: `/var/www/uniher`, PM2 process `uniher`, internal app `127.0.0.1:3000`.
- Do not use `git add .`.
- Do not reset, clean, stash or destructive-checkout the local worktree.
- Do not mix NR-1/Yavix/RH architectural work into this redesign closure.

## Current Lane Status

| Lane | Status | Next action |
| --- | --- | --- |
| `visual-contained-pages` | PASS visual QA | keep allowlisted; do not restage broadly |
| `wave5-ledger` | PASS foundation | keep allowlisted |
| `wave6-objectives` | PASS local validation | keep allowlisted |
| `wave7-challenges` | ready | implement next |
| `wave8-achievements` | waiting on Wave 7 | implement after Wave 7 |
| `wave9-semaforo` | blocked for production behavior | audit as blocked/visual-only, do not activate data |
| `wave10-liga` | blocked for policy behavior | audit as blocked/visual-only, do not activate ranking |

## Global Stop Conditions

Stop and mark BLOCKED instead of improvising if any step requires:

- secrets, VPS SSH credentials, or production host access that cannot be discovered locally;
- production Semaforo diagnosis, self-report, clinical copy, escalation, retention, deletion or consent decisions;
- Liga/ranking/contest policy decisions;
- RH reading individual collaborator objective/challenge/achievement progress;
- legacy points, badges, levels, league rows, `health_scores`, NR-1 answers, Yavix payloads or agenda/health sources as gamification inputs;
- deploying from a branch or commit that has not passed local tests, build and screenshot gates.

## Task 1: Overnight Coordinator Preflight

**Files:**
- Read: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Read: `docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md`
- Read: `docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md`
- Read: `docs/OPERACAO_VPS.md`
- Update as needed: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

- [ ] Run git and deploy preflight.

```powershell
git status --short --branch
git diff --check
git remote -v
gh auth status
Get-ChildItem -Recurse -File deploy
```

Expected:
- branch is `codex/uniher-wave3-collaborator-nr1`;
- `git diff --check` has no whitespace errors;
- GitHub auth is logged in;
- deploy files exist under `deploy/vps/`.

- [ ] Close any local QA dev server before final test/build runs if it is still listening on `3011`.

```powershell
netstat -ano | Select-String ':3011'
```

If a listener exists, stop only that PID after verifying it belongs to this UniHER dev server.

- [ ] Record a coordinator note in `SESSION_ORCHESTRATION_LEDGER.md` that long-session execution is active and that staging remains allowlist-only.

## Task 2: Wave 7 Company Challenges

**Files:**
- Create: `docs/superpowers/specs/2026-07-22-uniher-company-challenges-design.md`
- Create: `docs/superpowers/plans/2026-07-22-uniher-company-challenges.md`
- Create: `docs/superpowers/audits/2026-07-22-uniher-wave7-challenges-scorecard.md`
- Create: `src/lib/db/migrations/058_company_challenges_v2.sql`
- Create: `src/types/challenges.ts`
- Create: `src/lib/challenges/catalog.ts`
- Create: `src/lib/challenges/api.ts`
- Create: `src/repositories/challenges.repository.ts`
- Create: `src/services/company-challenges.service.ts`
- Create/modify: `src/app/api/collaborator/challenges/route.ts`
- Create/modify: `src/app/api/collaborator/challenges/[id]/route.ts`
- Modify: `src/app/(platform)/desafios/page.tsx`
- Modify: `src/lib/privacy/dsar-export.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/rh/users/[id]/route.ts`
- Test: `tests/unit/company-challenges.test.ts`
- Test: `tests/unit/privacy/dsar-stable-pagination.test.ts`

- [ ] Write the Wave 7 spec and child plan before code changes.

Contract:
- collaborator voluntarily joins company-curated challenges;
- RH sees catalog and privacy-safe aggregate only later, not individual collaborator progress in this first collaborator wave;
- v1 catalog has no health answers, mood, Semaforo, NR-1, appointment, exam or sensitive source;
- emitted eligible events: `challenge_joined`, `challenge_progressed`, `challenge_completed`, `challenge_left`;
- source domain: `company_challenge`;
- legacy `/api/rh/challenges` and existing routes must not be reconnected to contaminated progress unless explicitly rewritten under this contract.

- [ ] Add migration 058 with new company challenge tables.

Minimum tables:
- `company_challenge_catalog`
- `user_company_challenges`

Required columns:
- `company_id`, `user_id`, `challenge_id`;
- status: `joined`, `completed`, `left`;
- progress integer 0..100;
- timestamps for join, update, complete, left;
- indexes by company/user/status.

- [ ] Add repository/service and tests proving:
- only active collaborator self-capable users can join/update/leave;
- cross-company reads return nothing;
- duplicate join is idempotent or fails closed with 409;
- leave creates `challenge_left` or revokes as specified in the child plan;
- completion creates `challenge_completed`;
- no legacy points/badges/league/health tables are touched.

- [ ] Update `/desafios` into a functional collaborator page with:
- loading;
- denied;
- API error;
- empty catalog;
- joined challenges;
- completed/left states;
- approved catalog cards;
- no ranking, points or employer-visible individual progress.

- [ ] Run focused gates.

```powershell
npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
npx tsc --noEmit
npm run build
```

- [ ] Capture screenshots.

Output directory:

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-wave7-challenges-2026-07-22`

Required:
- `desafios-desktop.png`
- `desafios-desktop-viewport-bottom.png`
- `desafios-mobile.png`
- `desafios-mobile-viewport-top.png`
- `desafios-mobile-viewport-bottom.png`
- `metrics.json`

- [ ] Write Wave 7 scorecard and update ledger.

## Task 3: Wave 8 Private Achievements

**Files:**
- Create: `docs/superpowers/specs/2026-07-22-uniher-private-achievements-design.md`
- Create: `docs/superpowers/plans/2026-07-22-uniher-private-achievements.md`
- Create: `docs/superpowers/audits/2026-07-22-uniher-wave8-achievements-scorecard.md`
- Create: `src/lib/db/migrations/059_private_achievements.sql`
- Create: `src/types/achievements.ts`
- Create: `src/lib/achievements/catalog.ts`
- Create: `src/repositories/achievements.repository.ts`
- Create: `src/services/private-achievements.service.ts`
- Create: `src/app/api/collaborator/achievements/route.ts`
- Modify: `src/app/(platform)/conquistas/page.tsx`
- Modify: `src/lib/privacy/dsar-export.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/rh/users/[id]/route.ts`
- Test: `tests/unit/private-achievements.test.ts`
- Test: `tests/unit/privacy/dsar-stable-pagination.test.ts`

- [ ] Write the Wave 8 spec and child plan.

Contract:
- private achievements only;
- deterministic over non-revoked eligible events from Wave 5/6/7;
- no holder counts, rarity, social sharing, company leaderboard, legacy badge reuse or health-derived achievement;
- collaborator sees own unlocked/locked states;
- DSAR includes achievement rows;
- fulfilled erasure deletes achievement rows.

- [ ] Implement private achievement evaluation.

Allowed v1 examples:
- first personal objective started;
- first objective completed;
- first challenge joined;
- first challenge completed.

- [ ] Update `/conquistas` into a functional private page.

States:
- loading;
- denied;
- error;
- locked achievements;
- unlocked achievements;
- privacy contract band.

- [ ] Run gates.

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/company-challenges.test.ts tests/unit/personal-objectives.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
npx tsc --noEmit
npm run build
```

- [ ] Capture screenshots.

Output directory:

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-wave8-achievements-2026-07-22`

Required:
- `conquistas-desktop.png`
- `conquistas-desktop-viewport-bottom.png`
- `conquistas-mobile.png`
- `conquistas-mobile-viewport-top.png`
- `conquistas-mobile-viewport-bottom.png`
- `metrics.json`

- [ ] Write Wave 8 scorecard and update ledger.

## Task 4: Semaforo And Liga Final Scope Audit

**Files:**
- Modify only docs unless an already-approved visual-only correction is required:
  - `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
  - `docs/superpowers/audits/2026-07-22-uniher-wave9-10-blocked-scope-scorecard.md`

- [ ] Audit `/semaforo` and `/liga` current route behavior.

Commands:

```powershell
rg -n "semaforo|liga|ranking|health_scores|score|points|leaderboard" src/app src/lib src/services src/repositories tests/unit/privacy -S
```

- [ ] Confirm `/semaforo` remains blocked for production behavior.

Acceptable:
- visual contained page;
- fail-closed APIs;
- no feed into objectives/challenges/achievements/liga/RH/NR-1.

- [ ] Confirm `/liga` remains blocked for production behavior.

Acceptable:
- visual contained page;
- no public/company ranking;
- no legacy points or user league rendering;
- no new scoring policy unless separately approved.

- [ ] Produce scorecard: PASS blocked/contained, or BLOCKED if any route leaks old behavior.

## Task 5: Full Diff Review And Allowlist Packaging

**Files:**
- Create: `docs/superpowers/audits/2026-07-22-uniher-final-redesign-diff-review.md`

- [ ] Generate actual changed file lists.

```powershell
git status --short --branch
git diff --name-status
git ls-files --others --exclude-standard
git diff --stat
```

- [ ] Split staging allowlists into packages:

Package A: visual-contained pages.

Package B: Wave 5 ledger.

Package C: Wave 6 objectives.

Package D: Wave 7 challenges.

Package E: Wave 8 achievements.

Package F: orchestration docs/research.

Package G: deployment docs only if changed.

Never include:
- Yavix research unless intentionally packaged as docs;
- `data/`, `.next/`, local logs, screenshots outside `outputs`;
- secrets or env files.

- [ ] Review actual diffs for every package before staging.

Required commands:

```powershell
git diff -- <each tracked file>
git diff --no-index -- /dev/null <each important untracked file>
```

On Windows, if `/dev/null` is not accepted, use:

```powershell
git diff --no-index NUL <path>
```

- [ ] Run full local gates.

```powershell
git diff --check
npm run test:unit
npx tsc --noEmit
npm run build
```

If full unit is too slow or fails from unrelated pre-existing tests, record exact failing tests and rerun the focused release bundle. Do not hide the failure.

## Task 6: Commit And Push

**Files:**
- No code changes unless the diff review finds a blocker.

- [ ] Stage only explicit allowlists.

Pattern:

```powershell
git add -- <exact file 1> <exact file 2> ...
git diff --cached --name-status
git diff --cached --check
```

- [ ] Create one or more commits by package if the cached diff is clean.

Recommended commit grouping:
- `feat: add privacy-safe participation ledger`
- `feat: add self-only personal objectives`
- `feat: add company challenges`
- `feat: add private achievements`
- `docs: record UniHER redesign orchestration`

If package boundaries are too interdependent, use a single integration commit:

```powershell
git commit -m "feat: complete authenticated UniHER redesign waves"
```

- [ ] Push the branch.

```powershell
git push -u origin codex/uniher-wave3-collaborator-nr1
```

- [ ] Open or update PR only after push if not already present.

```powershell
gh pr create --fill --base main --head codex/uniher-wave3-collaborator-nr1
```

If a PR already exists, use:

```powershell
gh pr view --web
```

## Task 7: Merge Strategy

Deployment docs expect VPS deploy from `main`. Therefore:

- [ ] Check PR status and branch diff.

```powershell
gh pr status
gh pr checks
```

- [ ] Merge only when local gates and GitHub checks are green.

Preferred:

```powershell
gh pr merge --squash --delete-branch
```

If direct push to `main` is required instead, stop and record the reason before doing it.

## Task 8: VPS Deploy

**Files:**
- Read: `docs/OPERACAO_VPS.md`
- Read: `docs/CHECKLIST_PRODUCAO.md`
- Read: `deploy/vps/deploy.sh`

- [ ] Discover and verify VPS access.

Commands to try, without exposing secrets in logs:

```powershell
ssh -T <known-vps-alias-or-host> "hostname && pwd && test -d /var/www/uniher && echo UNIHER_OK"
```

If no host/alias is known locally, mark deployment BLOCKED and report that GitHub push/PR is complete but VPS deploy needs host credentials.

- [ ] On VPS, deploy `main` only after merge.

Remote command:

```bash
cd /var/www/uniher
git fetch origin
git reset --hard origin/main
bash deploy/vps/deploy.sh main
```

- [ ] Run post-deploy checks.

Remote:

```bash
curl -fsS http://127.0.0.1:3000/api/health
pm2 status uniher
pm2 logs uniher --lines 80 --nostream
```

Browser/local:
- open production host if known;
- verify `/api/health`;
- verify authenticated `/objetivos`, `/desafios`, `/conquistas` if credentials exist;
- save final screenshots under:

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-production-deploy-2026-07-22`

## Task 9: Final Closeout

**Files:**
- Create: `docs/superpowers/audits/2026-07-22-uniher-final-redesign-release-scorecard.md`

- [ ] Record:
- branch/commit SHA;
- PR URL;
- merge SHA;
- deploy command result;
- production health response;
- route screenshots;
- known residual warnings;
- blocked future work: Semaforo production behavior, Liga policy, Wave 5 scheduled retention cleanup, NR-1/Yavix separate task.

- [ ] Final answer should include:
- what shipped;
- what was validated;
- GitHub URL/PR;
- deploy URL/health;
- residual risks;
- no claim of visual approval without screenshots.
